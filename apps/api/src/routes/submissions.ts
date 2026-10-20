import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Queue } from 'bullmq';
import { z } from 'zod';
import { PENDING, SubmitBody, isTerminal, objectId, type Status } from '@oj/contracts';
import { ContestModel, OutboxModel, ProblemModel, SubmissionModel, Types, type Submission } from '@oj/db';
import { PRIORITY, type JudgeJob } from '@oj/queue';
import { putOrInline, type ObjectStore } from '@oj/storage';
import { LANGUAGE_SPEC } from '@oj/contracts';
import { AppError, forbidden, notFound } from '../errors.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { redis } from '../redis.js';
import { subscribe } from '../services/statusBus.js';

const IdParam = z.object({ id: objectId });
const MineQuery = z.object({ problemId: objectId.optional(), limit: z.coerce.number().int().min(1).max(50).default(20) });

type Row = Partial<Submission> & { _id: unknown };
const view = (s: Row) => ({
  id: String(s._id), problemId: String(s.problemId), contestId: s.contestId ? String(s.contestId) : null, language: s.language,
  status: s.status, failedTestcaseIdx: s.failedTestcaseIdx ?? null, passedCount: s.passedCount ?? 0, totalCount: s.totalCount ?? 0,
  timeMs: s.timeMs ?? null, memoryKb: s.memoryKb ?? null, compilerLog: s.compilerLog ?? '', stderrTail: s.stderrTail ?? '',
  submittedAt: s.submittedAt, judgedAt: s.judgedAt ?? null,
});

export function submissionsRouter(queue: Queue<JudgeJob>, store: ObjectStore) {
  const r = Router();

  // the submit path. lld §4.5. writes the row, the outbox event and the job;
  // returns 202 in well under 200 ms and never waits for a verdict.
  r.post('/', authenticate, authorize(), rateLimit('submit'), validate('body', SubmitBody), async (req, res, next) => {
    try {
      const body = req.body as SubmitBody;
      const userId = req.user!.sub;
      const idem = req.header('idempotency-key');
      const idemKey = idem ? `idem:${userId}:${idem}` : null;
      if (idemKey) {
        const existing = await redis.get(idemKey).catch(() => null);
        if (existing) {
          const s = await SubmissionModel.findById(existing).lean();
          if (s) return res.status(200).json({ submissionId: existing, status: s.status, deduplicated: true });
        }
      }
      const problem = await ProblemModel.findById(body.problemId).lean();
      if (!problem || (!problem.isPublic && req.user!.role === 'user')) throw notFound('problem');
      if (body.contestId) {
        const c = await ContestModel.findById(body.contestId).lean();
        const now = Date.now();
        if (!c || now < c.startAt.getTime() || now > c.endAt.getTime()) throw new AppError('CONTEST_NOT_RUNNING', 'contest is not running');
        if (!c.participants.some((u) => String(u) === userId)) throw new AppError('FORBIDDEN', 'register for the contest first');
        if (!c.problems.some((p) => String(p.problemId) === body.problemId)) throw new AppError('VALIDATION_FAILED', 'problem is not in this contest');
      }
      // the object goes in before the row: an orphaned object is garbage, a row
      // pointing at a missing object is a permanent IE. lld §4.5
      const subId = new Types.ObjectId();
      const ext = LANGUAGE_SPEC[body.language].file.split('.').pop();
      const codeRef = await putOrInline(store, `code/${String(subId)}.${ext}`, body.code);
      const sub = await SubmissionModel.create({
        _id: subId, userId, problemId: problem._id, contestId: body.contestId ?? null, language: body.language,
        codeRef, status: 'QUEUED',
      });
      const id = String(sub._id);
      await OutboxModel.create({
        aggregateId: id, topic: 'submission.created', key: id, sentAt: null,
        envelope: { eventId: randomUUID(), type: 'submission.created', version: 1, occurredAt: sub.submittedAt.toISOString(), producer: 'api',
          payload: { submissionId: id, userId, problemId: String(problem._id), contestId: body.contestId ?? null, language: body.language, submittedAt: sub.submittedAt.toISOString() } },
      });
      await queue.add('judge', { submissionId: id }, { jobId: id, priority: body.contestId ? PRIORITY.contest : PRIORITY.practice });
      if (idemKey) await redis.set(idemKey, id, 'EX', 600).catch(() => undefined);
      res.status(202).json({ submissionId: id, status: 'QUEUED' });
    } catch (e) { next(e); }
  });

  r.get('/', authenticate, authorize(), validate('query', MineQuery), async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof MineQuery>;
      const rows = await SubmissionModel.find({ userId: req.user!.sub, ...(q.problemId ? { problemId: q.problemId } : {}) })
        .sort({ submittedAt: -1 }).limit(q.limit).lean();
      res.json({ items: rows.map(view) });
    } catch (e) { next(e); }
  });

  const load = async (id: string, user: { sub: string; role: string }) => {
    const s = await SubmissionModel.findById(id).lean();
    if (!s) throw notFound('submission');
    if (String(s.userId) !== user.sub && user.role === 'user') throw forbidden();
    return s;
  };

  r.get('/:id', authenticate, authorize(), validate('params', IdParam), async (req, res, next) => {
    try {
      const s = await load((req.params as { id: string }).id, req.user!);
      res.json({ submission: view(s), code: await store.get(s.codeRef) });
    } catch (e) { next(e); }
  });

  // a setter re-queues a judged submission: after a test case fix, a runner
  // image rollback, or an IE. the row goes back to QUEUED with its verdict
  // fields cleared and attempts reset so the sweeper's budget starts over.
  // the job id is unique per rejudge because bullmq remembers completed ids.
  r.post('/:id/rejudge', authenticate, authorize('setter'), validate('params', IdParam), async (req, res, next) => {
    try {
      const id = (req.params as { id: string }).id;
      const s = await SubmissionModel.findOneAndUpdate(
        { _id: id, status: { $nin: [...PENDING] } },
        { $set: { status: 'QUEUED', failedTestcaseIdx: null, passedCount: 0, totalCount: 0, timeMs: null, memoryKb: null, compilerLog: '', stderrTail: '', attempts: 0, judgedBy: null, judgedAt: null } },
        { new: true },
      ).lean();
      if (!s) {
        const exists = await SubmissionModel.exists({ _id: id });
        throw exists ? new AppError('CONFLICT', 'submission is already being judged') : notFound('submission');
      }
      await queue.add('judge', { submissionId: id }, { jobId: `${id}:rejudge:${Date.now()}`, priority: PRIORITY.rejudge });
      res.status(202).json({ submissionId: id, status: 'QUEUED' });
    } catch (e) { next(e); }
  });

  // server-sent events until terminal. lld §10.1
  r.get('/:id/stream', authenticate, authorize(), validate('params', IdParam), async (req, res, next) => {
    try {
      const id = (req.params as { id: string }).id;
      const s = await load(id, req.user!);
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      send('status', view(s));
      if (isTerminal(s.status as Status)) return res.end();

      const unsub = subscribe(id, async (ev) => {
        send('status', ev);
        if (isTerminal(ev.status as Status)) {
          // the durable record is mongo; re-read so the client gets the full row
          const full = await SubmissionModel.findById(id).lean();
          if (full) send('status', view(full));
          cleanup(); res.end();
        }
      });
      const ping = setInterval(() => res.write(':ping\n\n'), 15_000);
      const cap = setTimeout(() => { send('timeout', {}); cleanup(); res.end(); }, 120_000);
      const cleanup = () => { clearInterval(ping); clearTimeout(cap); unsub(); };
      req.on('close', cleanup);
    } catch (e) { next(e); }
  });

  return r;
}
