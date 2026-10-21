import Anthropic from '@anthropic-ai/sdk';
import type { Mode } from '@oj/mentor';
import { config } from './config.js';
import { logger } from './logger.js';

export interface Completion {
  /** text chunks as they arrive */
  chunks: AsyncIterable<string>;
  /** resolves after the stream ends */
  usage: () => Promise<{ inputTokens: number; outputTokens: number; model: string }>;
}

export interface Turn { role: 'user' | 'assistant'; content: string }

export interface Provider {
  readonly name: string;
  complete(mode: Mode, system: string, turns: Turn[], signal?: AbortSignal): Completion;
}

/** streams from the messages api. thinking stays on at low effort for the
 * fast modes and medium for the strong ones; server-side fallbacks are on
 * so a safety decline reroutes instead of leaving the learner with nothing. */
export class AnthropicProvider implements Provider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;
  constructor(apiKey: string) { this.client = new Anthropic({ apiKey }); }

  complete(mode: Mode, system: string, turns: Turn[], signal?: AbortSignal): Completion {
    const model = mode.model === 'strong' ? config.AI_MODEL_STRONG : config.AI_MODEL_FAST;
    const stream = this.client.beta.messages.stream({
      model,
      max_tokens: mode.maxOutputTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: mode.model === 'strong' ? 'medium' : 'low' },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: turns.map((t) => ({ role: t.role, content: t.content })),
    }, { signal });
    const chunks = (async function* () {
      for await (const ev of stream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') yield ev.delta.text;
      }
    })();
    return {
      chunks,
      usage: async () => {
        const m = await stream.finalMessage();
        if (m.stop_reason === 'refusal') logger.warn({ category: m.stop_details?.category }, 'mentor reply refused');
        return { inputTokens: m.usage.input_tokens, outputTokens: m.usage.output_tokens, model: m.model };
      },
    };
  }
}

/** no key, no bill. replies are canned per mode but still go through the
 * guard, the budget and the cache, so the whole pipeline is exercised. */
export class FakeProvider implements Provider {
  readonly name = 'fake';
  /** `transcript` is every user turn joined, so a test can see the whole prompt; `turns` is the raw list */
  constructor(private readonly reply?: (mode: Mode, transcript: string, turns: Turn[]) => string) {}
  complete(mode: Mode, _system: string, turns: Turn[]): Completion {
    const user = turns.filter((t) => t.role === 'user').map((t) => t.content).join('\n\n');
    const text = this.reply ? this.reply(mode, user, turns) : turns.length > 1 ? cannedFollowUp(mode, turns) : canned(mode, user);
    const words = text.split(/(?<=\s)/);
    const chunks = (async function* () {
      for (const w of words) { await new Promise((r) => setTimeout(r, 8)); yield w; }
    })();
    return { chunks, usage: async () => ({ inputTokens: Math.ceil(user.length / 4), outputTokens: Math.ceil(text.length / 4), model: 'fake' }) };
  }
}

/** a follow-up in persona: short, refers to what the learner just said */
function cannedFollowUp(mode: Mode, turns: Turn[]) {
  const last = (turns[turns.length - 1]?.content ?? '').replace(/^--- the learner says ---\n/, '').trim();
  const quoted = last.length > 80 ? `${last.slice(0, 80)}…` : last;
  switch (mode.id) {
    case 1: return `(fake provider)\n\non "${quoted}": close — ask yourself what one number you need to carry from the previous position to decide the current one. if you can name it, you have the pattern.`;
    case 2: return `(fake provider)\n\nabout "${quoted}": that is the right instinct. before changing the code, write down what the variable should hold after each step on the sample. where does your version disagree first?`;
    case 3: return `(fake provider)\n\nlooking at the trace again with "${quoted}" in mind: find the first line where the variable differs from what the correct answer needs, and read only up to there. everything after it is a consequence.`;
    case 4: return `(fake provider)\n\nre "${quoted}": the measurement says what grows, not why. name the loop that repeats work per element, then ask what structure answers that query in constant or log time.`;
    case 5: return `(fake provider)\n\n"${quoted}" — keep the metaphor: the invariant is the rule the structure never breaks. restate it in your own words and the operation's cost follows from it.`;
    default: return `(fake provider)\n\non "${quoted}": good. do the first of the three catalogue problems now, with the operations we listed, and come back with the line you got stuck on.`;
  }
}

function canned(mode: Mode, user: string) {
  const title = /problem: (.*)/.exec(user)?.[1] ?? 'this problem';
  switch (mode.id) {
    case 1: return `(fake provider — set AI_API_KEY for real answers)\n\nfor ${title}, the constraints are the tell: the input is large enough that anything quadratic is out. think about what single pass over the input could carry enough state to answer at each step. edge cases people miss: a single element, all values negative, and the answer sitting at the very end.`;
    case 2: return `(fake provider)\n\nyour structure is reasonable. the gap is the reset condition: ask yourself what the running value should be when it goes below zero, and whether the line that updates it can ever see a negative value from the previous step.`;
    case 3: { const t = /--- trace ---\n([\s\S]*?)\n--- end trace ---/.exec(user)?.[1] ?? '(no trace)'; return `(fake provider)\n\nhere is the trace that actually ran, verbatim:\n\n${t.slice(0, 1200)}\n\nlook for the first step where a variable holds something the correct answer could not.`; }
    case 4: { const c = /--- timing ---\n([\s\S]*?)\n--- end timing ---/.exec(user)?.[1] ?? '(no timing)'; return `(fake provider)\n\nmeasured growth:\n\n${c}\n\ntrust the measurement over the code reading. the construct responsible is the one whose work repeats per element.`; }
    case 5: return `(fake provider)\n\nthink of the structure as a row of mailboxes where each box knows the best answer ending at itself. the invariant: before you open box i, every box before it already holds its best answer. that is why a single sweep is enough.`;
    default: return `(fake provider)\n\nprimitives first: what the structure stores, what each operation costs, and how insert and delete move things. then three canonical problems in order: the easiest one in the catalogue, then the two that add one twist each.`;
  }
}

export function providerFromConfig(): Provider {
  if (config.provider === 'anthropic') return new AnthropicProvider(config.AI_API_KEY);
  logger.warn('ai mentor running with the fake provider (no AI_API_KEY)');
  return new FakeProvider();
}
