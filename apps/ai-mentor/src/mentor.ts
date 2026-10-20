import type { Executor } from '@oj/sandbox';
import type { Language } from '@oj/contracts';
import { MODES, type Mode, type ModeId } from '@oj/mentor';
import { metrics } from '@oj/telemetry';
import type { Budget, ReplyCache } from './budget.js';
import { assertMentorAllowed, catalogueByTag, loadProblem, recentVerdicts, renderUserTurn } from './context.js';
import { AppError } from './errors.js';
import { BLOCKED_REPLY, guardWhole, guardedStream } from './guard.js';
import { traceOnSample } from './modes/tracer.js';
import { measure } from './modes/timing.js';
import type { Provider } from './provider.js';

export interface MentorDeps { provider: Provider; executor: Executor; budget: Budget; cache: ReplyCache }

export interface Ask { userId: string; problemId: string; mode: ModeId; language: Language; code: string; contestId?: string | null }

export type MentorEvent =
  | { type: 'meta'; mode: Mode; cached: boolean; provider: string }
  | { type: 'status'; text: string }
  | { type: 'token'; text: string }
  | { type: 'blocked'; rule: string; text: string }
  | { type: 'done'; outputTokens: number; remaining: number };

/** one question, one stream of events. all the policy lives here so the
 * http layer is just serialisation. */
export async function* answer(deps: MentorDeps, ask: Ask, signal?: AbortSignal): AsyncGenerator<MentorEvent> {
  const mode = MODES[ask.mode];
  await assertMentorAllowed(ask.contestId);
  const problem = await loadProblem(ask.problemId);

  const key = deps.cache.key(problem.id, mode.id, mode.needsExecution || mode.contextParts.includes('userCode') ? ask.code : '');
  const hit = await deps.cache.get(key);
  if (hit) {
    yield { type: 'meta', mode, cached: true, provider: deps.provider.name };
    yield { type: 'token', text: hit };
    const b = await deps.budget.check(ask.userId);
    yield { type: 'done', outputTokens: 0, remaining: b.ok ? b.remaining : 0 };
    return;
  }

  const b = await deps.budget.check(ask.userId);
  if (!b.ok) throw new AppError('AI_BUDGET_EXCEEDED', b.reason);

  // everything that can be rejected is rejected before the first byte goes
  // out, so the client sees a proper status instead of an error frame.
  const sample = problem.samples[0];
  if (mode.needsExecution) {
    if (!ask.code.trim()) throw new AppError('VALIDATION_FAILED', `${mode.name} needs your code in the editor`);
    if (!sample) throw new AppError('VALIDATION_FAILED', 'this problem has no sample to run');
  }
  yield { type: 'meta', mode, cached: false, provider: deps.provider.name };

  // execution-backed modes gather evidence first
  const extras: { trace?: string; failedSampleIO?: string; timingCurve?: string } = {};
  if (mode.id === 3 && sample) {
    yield { type: 'status', text: 'running your code on sample 1…' };
    const t = await traceOnSample(deps.executor, ask.language, ask.code, sample);
    extras.failedSampleIO = t.sampleRun;
    extras.trace = t.trace ?? '(line trace is python-only in this version; the sample run above is real)';
  }
  if (mode.id === 4 && sample) {
    yield { type: 'status', text: 'timing your code at four input sizes…' };
    const m = await measure(deps.executor, ask.language, ask.code, sample.input, problem.timeLimitMs);
    extras.timingCurve = m.text;
  }

  const [verdicts, catalogue] = await Promise.all([
    mode.contextParts.includes('recentVerdicts') ? recentVerdicts(ask.userId, problem.id) : Promise.resolve([]),
    mode.contextParts.includes('catalogueByTag') ? catalogueByTag(problem.tags, problem.id) : Promise.resolve([]),
  ]);
  const user = renderUserTurn(mode, problem, { language: ask.language, code: ask.code, verdicts, catalogue, ...extras });
  metrics.aiTokens.inc({ mode: String(mode.id), direction: 'in' }, Math.ceil((mode.systemPrompt.length + user.length) / 4));

  const completion = deps.provider.complete(mode, mode.systemPrompt, user, signal);
  let full = '';
  let blocked = false;
  if (mode.streaming) {
    for await (const ev of guardedStream(completion.chunks, ask.language)) {
      if ('blocked' in ev) { blocked = true; yield { type: 'blocked', rule: ev.blocked, text: BLOCKED_REPLY }; break; }
      full += ev.text;
      yield { type: 'token', text: ev.text };
    }
  } else {
    for await (const c of completion.chunks) full += c;
    const v = guardWhole(full, ask.language);
    if (v.blocked) { blocked = true; yield { type: 'blocked', rule: v.rule!, text: BLOCKED_REPLY }; }
    else yield { type: 'token', text: full };
  }

  const usage = await completion.usage().catch(() => ({ inputTokens: 0, outputTokens: Math.ceil(full.length / 4), model: 'unknown' }));
  metrics.aiTokens.inc({ mode: String(mode.id), direction: 'out' }, usage.outputTokens);
  await deps.budget.charge(ask.userId, usage.outputTokens);
  if (!blocked && full.trim()) await deps.cache.set(key, full);
  const after = await deps.budget.check(ask.userId);
  yield { type: 'done', outputTokens: usage.outputTokens, remaining: after.ok ? after.remaining : 0 };
}
