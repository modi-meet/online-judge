import { PENDING, PENALISED, type Terminal } from '@oj/contracts';
import { JudgeRunModel, OutboxModel, ProblemModel, SubmissionModel, TestcaseModel, UserModel, mongoose } from '@oj/db';
import type { DockerExecutor } from '@oj/sandbox';
import { compare } from './compare.js';
import { mapOutcome } from './verdict.js';

export interface JudgeDeps {
  executor: Pick<DockerExecutor, 'prepare'>;
  /** fan-out for sse: called on every status transition */
  publish: (submissionId: string, event: StatusEvent) => void | Promise<void>;
  workerId: string;
}

export interface StatusEvent {
  submissionId: string;
  status: string;
  failedTestcaseIdx?: number | null;
  passedCount?: number;
  totalCount?: number;
  timeMs?: number | null;
  memoryKb?: number | null;
  compilerLog?: string;
  stderrTail?: string;
}

export class AlreadyFinished extends Error {}

const inline = (ref: string) => (ref.startsWith('inline:') ? ref.slice(7) : ref);
const tail = (s: string, n: number) => (s.length > n ? s.slice(s.length - n) : s);

/**
 * judges one submission end to end. lld §7.4. every terminal write goes
 * through finish(), which is a compare-and-set against the pending states in
 * the same transaction as the outbox row (lld §7.6).
 */
export async function judgeSubmission(submissionId: string, deps: JudgeDeps): Promise<Terminal | null> {
  // claim it. no match means another worker owns it, or it already finished.
  const sub = await SubmissionModel.findOneAndUpdate(
    { _id: submissionId, status: { $in: [...PENDING] } },
    { $set: { status: 'COMPILING', judgedBy: deps.workerId }, $inc: { attempts: 1 } },
    { new: true },
  );
  if (!sub) return null;
  await deps.publish(submissionId, { submissionId, status: 'COMPILING' });

  const problem = await ProblemModel.findById(sub.problemId).lean();
  if (!problem) return finish(sub._id, 'IE', { stderrTail: 'problem missing' }, deps);
  const testcases = await TestcaseModel.find({ problemId: problem._id }).sort({ idx: 1 }).lean();
  if (testcases.length === 0) return finish(sub._id, 'IE', { stderrTail: 'problem has no test cases' }, deps);

  const limits = { cpuMs: problem.timeLimitMs, wallMs: problem.timeLimitMs * 2 + 1000, memoryMb: problem.memoryLimitMb };
  const session = await deps.executor.prepare(sub.language, inline(sub.codeRef), limits);
  try {
    if (session.compileError !== null) {
      return finish(sub._id, 'CE', { compilerLog: tail(session.compileError, 8192), totalCount: testcases.length }, deps);
    }

    const claimed = await SubmissionModel.updateOne({ _id: sub._id, status: 'COMPILING' }, { $set: { status: 'RUNNING', totalCount: testcases.length } });
    if (claimed.matchedCount === 0) return null;
    await deps.publish(submissionId, { submissionId, status: 'RUNNING', totalCount: testcases.length });

    let maxTime = 0;
    let maxMem = 0;
    let passed = 0;
    // sequential on purpose: parallel cases contend for the pinned core and
    // make timings non-reproducible. hld §9.5
    for (const tc of testcases) {
      const r = await session.run(inline(tc.inputRef), limits);
      maxTime = Math.max(maxTime, r.cpuMs);
      maxMem = Math.max(maxMem, r.peakMemKb ?? 0);
      const v = mapOutcome(r, limits) ?? (compare(problem.checkerType as 'exact' | 'trim' | 'float', r.stdout, inline(tc.outputRef), problem.floatEps ?? undefined) ? 'AC' : 'WA');
      await JudgeRunModel.create({ submissionId: sub._id, testcaseIdx: tc.idx, cpuMs: r.cpuMs, wallMs: r.wallMs, peakMemKb: r.peakMemKb, exitCode: r.exitCode, signal: r.signal, verdict: v });
      if (v !== 'AC') {
        return finish(sub._id, v, {
          failedTestcaseIdx: tc.idx, passedCount: passed, totalCount: testcases.length,
          timeMs: maxTime, memoryKb: maxMem || null, stderrTail: tail(r.stderr, 8192),
        }, deps);
      }
      passed++;
    }
    return finish(sub._id, 'AC', { passedCount: passed, totalCount: testcases.length, timeMs: maxTime, memoryKb: maxMem || null }, deps);
  } finally {
    await session.dispose();
  }
}

interface FinishStats {
  failedTestcaseIdx?: number | null; passedCount?: number; totalCount?: number;
  timeMs?: number | null; memoryKb?: number | null; compilerLog?: string; stderrTail?: string;
}

async function finish(id: mongoose.Types.ObjectId, status: Terminal, stats: FinishStats, deps: JudgeDeps): Promise<Terminal> {
  const judgedAt = new Date();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const r = await SubmissionModel.updateOne(
        { _id: id, status: { $in: [...PENDING] } },
        { $set: { status, judgedAt, ...stats } },
        { session },
      );
      if (r.matchedCount === 0) throw new AlreadyFinished();
      const sub = (await SubmissionModel.findById(id, null, { session }).lean())!;
      await OutboxModel.create([{
        aggregateId: String(id),
        topic: 'submission.judged',
        key: String(sub.contestId ?? sub.userId),
        envelope: {
          eventId: crypto.randomUUID(), type: 'submission.judged', version: 1, occurredAt: judgedAt.toISOString(), producer: `judge-worker@${deps.workerId}`,
          payload: { submissionId: String(id), userId: String(sub.userId), problemId: String(sub.problemId), contestId: sub.contestId ? String(sub.contestId) : null,
            language: sub.language, submittedAt: sub.submittedAt.toISOString(), status, failedTestcaseIdx: sub.failedTestcaseIdx, passedCount: sub.passedCount, totalCount: sub.totalCount,
            timeMs: sub.timeMs, memoryKb: sub.memoryKb, judgedAt: judgedAt.toISOString() },
        },
        sentAt: null,
      }], { session });
      // first ac on a problem counts as solved
      if (status === 'AC') {
        const earlier = await SubmissionModel.countDocuments({ userId: sub.userId, problemId: sub.problemId, status: 'AC', _id: { $ne: id } }, { session });
        if (earlier === 0) await UserModel.updateOne({ _id: sub.userId }, { $inc: { solvedCount: 1 } }, { session });
      }
    });
  } catch (e) {
    if (e instanceof AlreadyFinished) return status;
    throw e;
  } finally {
    await session.endSession();
  }
  await deps.publish(String(id), { submissionId: String(id), status, ...stats });
  return status;
}

/** verdicts that cost penalty, re-exported for the projector */
export { PENALISED };
