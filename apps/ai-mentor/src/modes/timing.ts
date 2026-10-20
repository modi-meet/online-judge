import type { Executor } from '@oj/sandbox';
import type { Language } from '@oj/contracts';
import { DEFAULT_SIZES, fitGrowth, type Fit, type Sample } from '@oj/mentor';

// mode 4. the auditor is given measured runtimes, not a guess. inputs are
// scaled copies of the first sample; if the sample's shape is not one the
// generator understands, the fit is reported as inconclusive and says why.

export interface TimingResult { fit: Fit | null; text: string }

/**
 * understands the common competitive shape: an optional first line with n
 * (and maybe a second scalar), followed by n integers. everything else is
 * out of scope for v3 and says so.
 */
export function scaleInput(sample: string, n: number): string | null {
  const lines = sample.trim().split('\n');
  const head = lines[0]?.trim().split(/\s+/).map(Number) ?? [];
  if (head.length === 0 || head.some((x) => !Number.isInteger(x))) return null;
  const rest = lines.slice(1).join(' ').trim().split(/\s+/).filter(Boolean).map(Number);
  const n0 = head[0]!;
  if (rest.length !== n0 || rest.some((x) => !Number.isInteger(x))) return null;
  const lo = Math.min(...rest, -1000); const hi = Math.max(...rest, 1000);
  let seed = 1234567 + n;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return lo + (seed % (hi - lo + 1)); };
  const body: number[] = [];
  for (let i = 0; i < n; i++) body.push(rnd());
  const headOut = [n, ...head.slice(1)].join(' ');
  return `${headOut}\n${body.join(' ')}\n`;
}

export async function measure(executor: Executor, language: Language, code: string, sampleInput: string, timeLimitMs: number): Promise<TimingResult> {
  const sizes = DEFAULT_SIZES;
  const first = scaleInput(sampleInput, sizes[0]!);
  if (first === null) return { fit: null, text: 'no input generator for this problem\'s input shape (v3 understands "n, then n integers"); run the code on your own large input and watch the time' };
  const points: Sample[] = [];
  let note = '';
  for (const n of sizes) {
    const stdin = scaleInput(sampleInput, n)!;
    const r = await executor.exec({ language, code, stdin, limits: { cpuMs: Math.max(timeLimitMs * 4, 4000), wallMs: Math.max(timeLimitMs * 6, 8000), stdoutBytes: 1024 } });
    if (r.compileError) return { fit: null, text: `compile error:\n${r.compileError.slice(0, 600)}` };
    if (r.outcome === 'timeout') { note = `n=${n}: killed after ${r.cpuMs} ms cpu (limit ${timeLimitMs} ms)`; points.push({ n, cpuMs: r.cpuMs }); break; }
    if (r.outcome !== 'exited' || r.exitCode !== 0) { note = `n=${n}: crashed (${r.outcome}, exit ${r.exitCode ?? r.signal})`; break; }
    points.push({ n, cpuMs: r.cpuMs });
  }
  const fit = fitGrowth(points);
  const table = points.map((p) => `n=${p.n.toString().padStart(7)}  ${p.cpuMs.toString().padStart(6)} ms`).join('\n');
  const text = [table, note, `fit: ${fit.cls} — ${fit.note}`, `time limit: ${timeLimitMs} ms`].filter(Boolean).join('\n');
  return { fit, text };
}
