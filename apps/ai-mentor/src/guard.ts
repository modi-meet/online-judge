import { BLOCKED_REPLY, leakGuard } from '@oj/mentor';
import { metrics } from '@oj/telemetry';

// streaming modes: prose streams through untouched, but a code fence is held
// back until it closes and only released once the guard has seen it whole.
// the learner sees a short pause instead of half a solution.
export async function* guardedStream(chunks: AsyncIterable<string>, language: string): AsyncGenerator<{ text: string } | { blocked: 'A' | 'B' | 'C' }> {
  let buf = '';
  let inFence = false;
  for await (const c of chunks) {
    buf += c;
    for (;;) {
      const i = buf.indexOf('```');
      if (i === -1) {
        if (!inFence) { yield { text: buf }; buf = ''; }
        break;
      }
      if (!inFence) {
        // release prose before the fence, keep the fence open in the buffer
        if (i > 0) yield { text: buf.slice(0, i) };
        buf = buf.slice(i); inFence = true;
        const close = buf.indexOf('```', 3);
        if (close === -1) break;
        const block = buf.slice(0, close + 3);
        const v = leakGuard(block, { language });
        if (v.blocked) { metrics.leakGuard.inc({ rule: v.rule! }); yield { blocked: v.rule! }; return; }
        yield { text: block }; buf = buf.slice(close + 3); inFence = false;
      } else {
        const close = buf.indexOf('```', 3);
        if (close === -1) break;
        const block = buf.slice(0, close + 3);
        const v = leakGuard(block, { language });
        if (v.blocked) { metrics.leakGuard.inc({ rule: v.rule! }); yield { blocked: v.rule! }; return; }
        yield { text: block }; buf = buf.slice(close + 3); inFence = false;
      }
    }
  }
  // an unterminated fence at the end is treated as complete and checked
  if (buf) {
    const v = leakGuard(buf + (inFence ? '\n```' : ''), { language });
    if (v.blocked) { metrics.leakGuard.inc({ rule: v.rule! }); yield { blocked: v.rule! }; return; }
    yield { text: buf };
  }
}

export function guardWhole(text: string, language: string) {
  const v = leakGuard(text, { language });
  if (v.blocked) metrics.leakGuard.inc({ rule: v.rule! });
  return v;
}

export { BLOCKED_REPLY };
