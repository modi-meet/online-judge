import type { Terminal } from '@oj/contracts';
import type { ExecResult } from '@oj/sandbox';

/**
 * outcome → verdict, in the order from lld §6.3. first match wins. returns null
 * when the run itself was fine and the comparator decides ac vs wa.
 *
 * mle before tle matters: a program thrashing against its memory limit usually
 * trips the timer too, and reporting tle sends the user optimising the wrong axis.
 */
export function mapOutcome(r: ExecResult, limits: { cpuMs: number }): Exclude<Terminal, 'AC' | 'WA'> | null {
  if (r.compileError !== null) return 'CE';
  if (r.outcome === 'spawn_error') return 'IE';
  if (r.outcome === 'oom') return 'MLE';
  if (r.outcome === 'timeout' || r.cpuMs > limits.cpuMs) return 'TLE';
  if (r.stdoutTruncated) return 'OLE';
  if (r.signal !== null) return 'RE';
  if (r.exitCode !== 0) return 'RE';
  return null;
}
