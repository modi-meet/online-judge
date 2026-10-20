// mode 4: fit measured runtimes to a growth class. lld §11.4. honest by design:
// INCONCLUSIVE is a real answer, because a confident wrong complexity sends
// someone rewriting a correct solution.
//
// every real measurement carries a constant (interpreter start, reading
// input), so a log-log fit on the raw numbers under-reports the exponent at
// small n. instead each candidate class f is fit as t = c + k·f(n) by ordinary
// least squares and the class with the best r² wins.

export interface Sample { n: number; cpuMs: number }
export type GrowthClass = 'O(1) / O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(n³)' | 'exponential' | 'INCONCLUSIVE';

export interface Fit {
  cls: GrowthClass;
  r2: number | null;
  /** runner-up class and its r², so the prompt can say how sure the fit is */
  runnerUp: { cls: GrowthClass; r2: number } | null;
  used: Sample[];
  note: string;
}

export const NOISE_FLOOR_MS = 5;
const MIN_R2 = 0.9;

const MODELS: { cls: GrowthClass; f: (n: number) => number }[] = [
  { cls: 'O(1) / O(log n)', f: (n) => Math.log(n) },
  { cls: 'O(n)', f: (n) => n },
  { cls: 'O(n log n)', f: (n) => n * Math.log(n) },
  { cls: 'O(n²)', f: (n) => n * n },
  { cls: 'O(n³)', f: (n) => n * n * n },
];

/** r² of y ~ a + b·x */
function r2(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i]! - mx) * (ys[i]! - my); sxx += (xs[i]! - mx) ** 2; syy += (ys[i]! - my) ** 2; }
  if (sxx === 0 || syy === 0) return 0;
  return (sxy * sxy) / (sxx * syy);
}

export function fitGrowth(samples: Sample[]): Fit {
  const used = samples.filter((s) => s.cpuMs >= NOISE_FLOOR_MS && s.n > 0).sort((a, b) => a.n - b.n);
  if (used.length < 3) {
    return { cls: 'INCONCLUSIVE', r2: null, runnerUp: null, used, note: `fewer than 3 points above the ${NOISE_FLOOR_MS} ms noise floor — the inputs are too small to measure` };
  }
  const ns = used.map((s) => s.n);
  const ts = used.map((s) => s.cpuMs);
  if (ts.every((t) => t === ts[0])) {
    return { cls: 'O(1) / O(log n)', r2: 1, runnerUp: null, used, note: 'runtime does not move with n' };
  }
  const scored = MODELS.map((m) => ({ cls: m.cls, r2: r2(ns.map(m.f), ts) }));
  // exponential: log t is linear in n. only meaningful for small n, where 2^n is finite.
  if (Math.max(...ns) <= 200) scored.push({ cls: 'exponential', r2: r2(ns, ts.map(Math.log)) });
  scored.sort((a, b) => b.r2 - a.r2);
  const best = scored[0]!;
  const second = scored[1] ?? null;
  if (best.r2 < MIN_R2) {
    return { cls: 'INCONCLUSIVE', r2: best.r2, runnerUp: second, used, note: `no growth class fits the points (best r² ${best.r2.toFixed(2)}); timing noise or a mixed workload` };
  }
  const close = second && best.r2 - second.r2 < 0.005;
  return {
    cls: best.cls,
    r2: best.r2,
    runnerUp: second,
    used,
    note: close ? `${best.cls} fits best (r² ${best.r2.toFixed(3)}) but ${second!.cls} is close (r² ${second!.r2.toFixed(3)}) — more sizes would separate them` : `${best.cls} fits with r² ${best.r2.toFixed(3)}`,
  };
}

export const DEFAULT_SIZES = [100, 1_000, 10_000, 100_000];
