import { ContestModel, ProblemModel, SubmissionModel, TestcaseModel } from '@oj/db';
import type { ContextPart, Mode } from '@oj/mentor';
import { AppError } from './errors.js';

// the server builds the context; the client sends only the problem id, the
// mode and the code. nothing the client says can make a hidden test case
// appear in the prompt (lld §11.3).

export interface Sample { idx: number; input: string; output: string }

export interface ProblemContext {
  id: string;
  title: string;
  statement: string;
  constraints: string;
  tags: string[];
  timeLimitMs: number;
  samples: Sample[];
}

export async function loadProblem(problemId: string): Promise<ProblemContext> {
  const p = await ProblemModel.findById(problemId).lean();
  if (!p || !p.isPublic) throw new AppError('NOT_FOUND', 'Problem not found');
  // the query asks for samples only, and the guard below refuses anything
  // else that somehow came back. two independent checks, on purpose.
  const rows = await TestcaseModel.find({ problemId: p._id, isSample: true }).sort({ idx: 1 }).lean();
  const samples = rows.map((r) => {
    if (!r.isSample) throw new Error('leak guard: non-sample testcase reached the mentor context');
    return { idx: r.idx, input: inline(r.inputRef), output: inline(r.outputRef) };
  });
  const constraints = [p.inputFormat, p.outputFormat, ...p.statement.split('\n').filter((l) => /constraint|<=|≤|\^/.test(l))].filter(Boolean).join('\n');
  return { id: String(p._id), title: p.title, statement: p.statement, constraints, tags: p.tags, timeLimitMs: p.timeLimitMs, samples };
}

/** sample cases are tiny and always inline; a non-inline ref is a sample we
 * should not have been handed. refuse rather than fetch. */
const inline = (ref: string) => {
  if (!ref.startsWith('inline:')) throw new Error('leak guard: sample testcase is not inline');
  return ref.slice(7);
};

export async function recentVerdicts(userId: string, problemId: string) {
  const rows = await SubmissionModel.find({ userId, problemId }).sort({ submittedAt: -1 }).limit(5).lean();
  return rows.map((r) => `${r.status}${r.failedTestcaseIdx != null ? ` (failed case ${r.failedTestcaseIdx + 1} of ${r.totalCount})` : ''}${r.timeMs != null ? ` ${r.timeMs} ms` : ''}`);
}

export async function catalogueByTag(tags: string[], excludeId: string) {
  if (tags.length === 0) return [];
  const rows = await ProblemModel.find({ isPublic: true, tags: { $in: tags }, _id: { $ne: excludeId } }).sort({ difficulty: 1 }).limit(8).lean();
  return rows.map((r) => `${r.slug} — ${r.title} (${r.difficulty}; ${r.tags.join(', ')})`);
}

/** a running contest with the mentor switched off blocks every mode. */
export async function assertMentorAllowed(contestId: string | null | undefined) {
  if (!contestId) return;
  const c = await ContestModel.findById(contestId).lean();
  if (!c) throw new AppError('NOT_FOUND', 'Contest not found');
  const now = new Date();
  const running = c.startAt <= now && now < c.endAt;
  if (running && !c.aiMentorEnabled) throw new AppError('AI_DISABLED_IN_CONTEST', 'The mentor is switched off for this contest while it runs');
}

export interface Extras { trace?: string; failedSampleIO?: string; timingCurve?: string }

/** renders the user turn from the parts the mode asked for, nothing more. */
export function renderUserTurn(mode: Mode, p: ProblemContext, parts: { language: string; code: string; verdicts: string[]; catalogue: string[] } & Extras) {
  const out: string[] = [`problem: ${p.title}`];
  const want = new Set<ContextPart>(mode.contextParts);
  if (want.has('statement')) out.push(`--- statement ---\n${p.statement}`);
  if (want.has('constraints') && p.constraints) out.push(`--- constraints ---\n${p.constraints}`);
  if (want.has('userCode')) out.push(parts.code.trim() ? `--- user code (${parts.language}) ---\n${parts.code}` : '--- user code ---\n(empty)');
  if (want.has('recentVerdicts') && parts.verdicts.length) out.push(`--- recent verdicts, newest first ---\n${parts.verdicts.join('\n')}`);
  if (want.has('failedSampleIO') && parts.failedSampleIO) out.push(`--- sample run ---\n${parts.failedSampleIO}`);
  if (want.has('trace') && parts.trace) out.push(`--- trace ---\n${parts.trace}\n--- end trace ---`);
  if (want.has('timingCurve') && parts.timingCurve) out.push(`--- timing ---\n${parts.timingCurve}\n--- end timing ---`);
  if (want.has('catalogueByTag') && parts.catalogue.length) out.push(`--- catalogue (same tags) ---\n${parts.catalogue.join('\n')}`);
  return out.join('\n\n');
}
