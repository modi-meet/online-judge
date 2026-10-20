import { Router } from 'express';
import { z } from 'zod';
import { ContestBody, objectId } from '@oj/contracts';
import { ContestModel, ProblemModel, SubmissionModel, UserModel } from '@oj/db';
import { myRank, projectVerdict, readStandings, resetStandings } from '@oj/judge';
import { AppError, notFound } from '../errors.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { redis } from '../redis.js';

export const contestsRouter = Router();
const IdParam = z.object({ id: objectId });
const BoardQuery = z.object({ offset: z.coerce.number().int().min(0).default(0), limit: z.coerce.number().int().min(1).max(100).default(50) });

const phase = (c: { startAt: Date; endAt: Date }, now = Date.now()) =>
  now < c.startAt.getTime() ? 'upcoming' : now > c.endAt.getTime() ? 'ended' : 'running';

const summary = (c: { _id: unknown; title: string; startAt: Date; endAt: Date; problems: unknown[]; participants: unknown[]; scoring: string }) => ({
  id: String(c._id), title: c.title, startAt: c.startAt, endAt: c.endAt, phase: phase(c),
  problemCount: c.problems.length, participantCount: c.participants.length, scoring: c.scoring,
});

contestsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await ContestModel.find().sort({ startAt: -1 }).limit(50).lean();
    res.json({ items: rows.map(summary) });
  } catch (e) { next(e); }
});

contestsRouter.post('/', authenticate, authorize('setter'), validate('body', ContestBody), async (req, res, next) => {
  try {
    const body = req.body as ContestBody;
    const found = await ProblemModel.countDocuments({ _id: { $in: body.problems.map((p) => p.problemId) } });
    if (found !== body.problems.length) throw new AppError('VALIDATION_FAILED', 'unknown problem id in contest');
    const c = await ContestModel.create({ ...body, participants: [] });
    res.status(201).json({ id: String(c._id) });
  } catch (e) { next(e); }
});

// problems are visible once the contest has started. before that, only the count.
contestsRouter.get('/:id', authenticate, validate('params', IdParam), async (req, res, next) => {
  try {
    const c = await ContestModel.findById((req.params as { id: string }).id).lean();
    if (!c) throw notFound('contest');
    const ph = phase(c);
    const isSetter = req.user && req.user.role !== 'user';
    const problems = ph === 'upcoming' && !isSetter ? [] : await ProblemModel.find({ _id: { $in: c.problems.map((p) => p.problemId) } }).select('slug title difficulty').lean();
    const byId = new Map(problems.map((p) => [String(p._id), p]));
    const registered = !!req.user && c.participants.some((u) => String(u) === req.user!.sub);
    res.json({
      contest: { ...summary(c), aiMentorEnabled: c.aiMentorEnabled, registered },
      problems: c.problems.map((p, i) => {
        const doc = byId.get(String(p.problemId));
        return { letter: String.fromCharCode(65 + i), problemId: String(p.problemId), points: p.points, slug: doc?.slug ?? null, title: doc?.title ?? null, difficulty: doc?.difficulty ?? null };
      }),
    });
  } catch (e) { next(e); }
});

contestsRouter.post('/:id/register', authenticate, authorize(), validate('params', IdParam), async (req, res, next) => {
  try {
    const c = await ContestModel.findById((req.params as { id: string }).id);
    if (!c) throw notFound('contest');
    if (phase(c) === 'ended') throw new AppError('CONTEST_NOT_RUNNING', 'contest has ended');
    await ContestModel.updateOne({ _id: c._id }, { $addToSet: { participants: req.user!.sub } });
    res.status(204).end();
  } catch (e) { next(e); }
});

// top-n straight from the zset, usernames from one query. lld §9.3
contestsRouter.get('/:id/leaderboard', authenticate, validate('params', IdParam), validate('query', BoardQuery), async (req, res, next) => {
  try {
    const id = (req.params as { id: string }).id;
    const q = req.query as unknown as z.infer<typeof BoardQuery>;
    const c = await ContestModel.findById(id).lean();
    if (!c) throw notFound('contest');
    const rows = await readStandings(redis, id, q.offset, q.limit);
    const users = await UserModel.find({ _id: { $in: rows.map((r) => r.userId) } }).select('username').lean();
    const name = new Map(users.map((u) => [String(u._id), u.username]));
    const letters = Object.fromEntries(c.problems.map((p, i) => [String(p.problemId), String.fromCharCode(65 + i)]));
    res.json({
      total: await redis.zcard(`contest:${id}:board`),
      me: req.user ? await myRank(redis, id, req.user.sub) : null,
      items: rows.map((r) => ({
        rank: r.rank, username: name.get(r.userId) ?? '?', solved: r.solved, penalty: r.penalty,
        problems: Object.fromEntries(Object.entries(r.problems).map(([pid, st]) => [letters[pid] ?? pid, st])),
      })),
    });
  } catch (e) { next(e); }
});

// replay every submission in order. v1's source of truth is mongo; v2 replays the topic.
contestsRouter.post('/:id/rebuild', authenticate, authorize('setter'), validate('params', IdParam), async (req, res, next) => {
  try {
    const id = (req.params as { id: string }).id;
    const c = await ContestModel.findById(id).lean();
    if (!c) throw notFound('contest');
    await resetStandings(redis, id);
    const subs = await SubmissionModel.find({ contestId: c._id, submittedAt: { $lte: c.endAt }, judgedAt: { $ne: null } }).sort({ submittedAt: 1 }).lean();
    let applied = 0;
    for (const s of subs) {
      if (await projectVerdict(redis, id, String(s.userId), `rebuild:${String(s._id)}`, { problemId: String(s.problemId), status: s.status as never, submittedAt: s.submittedAt }, c.startAt)) applied++;
    }
    res.json({ replayed: subs.length, applied });
  } catch (e) { next(e); }
});
