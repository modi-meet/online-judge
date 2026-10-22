import type { Executor } from '@oj/sandbox';
import type { Language } from '@oj/contracts';
import { MODES, type Mode, type ModeId } from '@oj/mentor';
import { metrics } from '@oj/telemetry';
import { randomUUID } from 'node:crypto';
import { MAX_TURNS, type Budget, type Conversation, type ConversationStore, type ReplyCache } from './budget.js';
import { assertMentorAllowed, catalogueByTag, loadProblem, recentVerdicts, renderUserTurn } from './context.js';
import { AppError } from './errors.js';
import { BLOCKED_REPLY, guardWhole, guardedStream } from './guard.js';
import { traceOnSample } from './modes/tracer.js';
import { measure } from './modes/timing.js';
import type { Provider } from './provider.js';

export interface MentorDeps { provider: Provider; executor: Executor; budget: Budget; cache: ReplyCache; conversations: ConversationStore }

export interface Ask {
  userId: string; problemId: string; mode: ModeId; language: Language; code: string; contestId?: string | null;
  /** a follow-up continues this conversation; absent means a fresh one */
  conversationId?: string | null;
  /** what the learner typed. optional on the first turn: the mode's opening question stands in */
  message?: string | null;
}

export type MentorEvent =
  | { type: 'meta'; mode: Mode; cached: boolean; provider: string; conversationId: string; turn: number }
  | { type: 'status'; text: string }
  | { type: 'token'; text: string }
  | { type: 'blocked'; rule: string; text: string }
  | { type: 'done'; outputTokens: number; remaining: number };

/**
 * one turn of a conversation, one stream of events. the first turn builds
 * the context (and runs the sandbox for modes 3 and 4); later turns append
 * the learner's message to the stored transcript. all the policy lives here
 * so the http layer is just serialisation.
 */
export async function* answer(deps: MentorDeps, ask: Ask, signal?: AbortSignal): AsyncGenerator<MentorEvent> {
  const mode = MODES[ask.mode];
  await assertMentorAllowed(ask.contestId);
  const problem = await loadProblem(ask.problemId);
  const message = ask.message?.trim() ?? '';

  // a follow-up: the transcript is ours, the learner only sends the message
  let conv: Conversation | null = null;
  if (ask.conversationId) {
    conv = await deps.conversations.get(ask.conversationId);
    if (!conv || conv.userId !== ask.userId) throw new AppError('NOT_FOUND', 'That conversation has expired; start a new one');
    if (conv.mode !== mode.id || conv.problemId !== problem.id) throw new AppError('VALIDATION_FAILED', 'a conversation stays on one problem in one mode; start a new one to switch');
    if (!message) throw new AppError('VALIDATION_FAILED', 'say something to continue the conversation');
    if (conv.turns.length >= MAX_TURNS) throw new AppError('VALIDATION_FAILED', 'this conversation is long enough; start a new one with what you learned');
  }

  // identical opening question → identical opening answer, free. follow-ups are never cached.
  const key = !conv && !message ? deps.cache.key(problem.id, mode.id, mode.needsExecution || mode.contextParts.includes('userCode') ? ask.code : '') : null;
  const hit = key ? await deps.cache.get(key) : null;
  if (hit && key) {
    // a cached opener still starts a real conversation, so follow-ups work
    const fresh: Conversation = { id: randomUUID(), userId: ask.userId, problemId: problem.id, mode: mode.id, language: ask.language, turns: [{ role: 'user', content: renderUserTurn(mode, problem, { language: ask.language, code: ask.code, verdicts: [], catalogue: [] }) }, { role: 'assistant', content: hit }] };
    await deps.conversations.put(fresh);
    yield { type: 'meta', mode, cached: true, provider: deps.provider.name, conversationId: fresh.id, turn: 1 };
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
  if (!conv && mode.needsExecution) {
    if (!ask.code.trim()) throw new AppError('VALIDATION_FAILED', `${mode.name} needs your code in the editor`);
    if (!sample) throw new AppError('VALIDATION_FAILED', 'this problem has no sample to run');
  }
  const id = conv?.id ?? randomUUID();
  const turnNo = conv ? conv.turns.length / 2 + 1 : 1;
  yield { type: 'meta', mode, cached: false, provider: deps.provider.name, conversationId: id, turn: turnNo };

  let turns: { role: 'user' | 'assistant'; content: string }[];
  if (conv) {
    turns = [...conv.turns, { role: 'user', content: `--- the learner says ---\n${message}` }];
  } else {
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
    const context = renderUserTurn(mode, problem, { language: ask.language, code: ask.code, verdicts, catalogue, ...extras });
    turns = [{ role: 'user', content: message ? `${context}\n\n--- the learner says ---\n${message}` : context }];
  }
  metrics.aiTokens.inc({ mode: String(mode.id), direction: 'in' }, Math.ceil((mode.systemPrompt.length + turns.reduce((n, t) => n + t.content.length, 0)) / 4));

  const completion = deps.provider.complete(mode, mode.systemPrompt, turns, signal);
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
  if (!blocked && full.trim() && key) await deps.cache.set(key, full);
  // the transcript keeps what the learner actually saw: a blocked reply is stored as the refusal
  const reply = blocked ? BLOCKED_REPLY : full;
  await deps.conversations.put({ id, userId: ask.userId, problemId: problem.id, mode: mode.id, language: ask.language, turns: [...turns, { role: 'assistant', content: reply }] });
  const after = await deps.budget.check(ask.userId);
  yield { type: 'done', outputTokens: usage.outputTokens, remaining: after.ok ? after.remaining : 0 };
}
