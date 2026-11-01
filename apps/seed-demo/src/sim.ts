// the pure half of the demo seed: random draws, a hidden difficulty rating per
// problem, how a person with a given skill does on a problem, and the rating
// update after a contest. no io here, so it is unit-tested.

/** mulberry32: small, fast, seeded; the same seed gives the same demo every run */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)]!,
    chance: (p: number) => next() < p,
    /** standard normal via box–muller */
    normal: () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next()),
    weighted: <T>(xs: readonly T[], w: (x: T) => number) => {
      const ws = xs.map(w); const total = ws.reduce((s, x) => s + x, 0);
      let r = next() * total;
      for (let i = 0; i < xs.length; i++) { r -= ws[i]!; if (r <= 0) return xs[i]!; }
      return xs[xs.length - 1]!;
    },
  };
}
export type Rng = ReturnType<typeof rng>;

export const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

/** a hidden rating inside each difficulty band, stable per problem */
export function problemRating(id: string, difficulty: 'easy' | 'medium' | 'hard') {
  const [lo, hi] = difficulty === 'easy' ? [800, 1300] : difficulty === 'medium' ? [1400, 1850] : [1900, 2500];
  return lo + (hash(id) % (hi - lo + 1));
}

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** chance that someone of this skill eventually gets the problem accepted */
export const solveChance = (skill: number, rating: number, scale = 120) => sigmoid((skill + 120 - rating) / scale);

/** wrong attempts before an accept: fewer the more the problem is below you */
export function wrongAttempts(r: Rng, skill: number, rating: number) {
  const pFail = Math.min(0.75, Math.max(0.08, 0.42 - (skill - rating) / 900));
  let n = 0;
  while (n < 6 && r.chance(pFail)) n++;
  return n;
}

export interface Standing { userId: string; solved: number; penalty: number }

/** competition ranking: ties on (solved, penalty) share a rank, the next rank skips */
export function rank(rows: Standing[]) {
  const sorted = [...rows].sort((a, b) => b.solved - a.solved || a.penalty - b.penalty || a.userId.localeCompare(b.userId));
  const out = new Map<string, number>();
  sorted.forEach((s, i) => {
    const prev = sorted[i - 1];
    out.set(s.userId, prev && prev.solved === s.solved && prev.penalty === s.penalty ? out.get(prev.userId)! : i + 1);
  });
  return out;
}

/**
 * elo over every pair in the contest. a win over someone rated above you is
 * worth more than a win over someone below. k is larger for the first few
 * contests so new ratings settle quickly. returns the delta per user.
 */
export function ratingDeltas(ratings: Map<string, number>, ranks: Map<string, number>, contestsPlayed: Map<string, number>) {
  const ids = [...ranks.keys()];
  const out = new Map<string, number>();
  if (ids.length < 2) { ids.forEach((id) => out.set(id, 0)); return out; }
  for (const a of ids) {
    let sum = 0;
    for (const b of ids) {
      if (a === b) continue;
      const expected = 1 / (1 + 10 ** ((ratings.get(b)! - ratings.get(a)!) / 400));
      const actual = ranks.get(a)! < ranks.get(b)! ? 1 : ranks.get(a)! === ranks.get(b)! ? 0.5 : 0;
      sum += actual - expected;
    }
    const k = (contestsPlayed.get(a) ?? 0) < 3 ? 260 : 150;
    out.set(a, Math.round((k * sum) / (ids.length - 1)));
  }
  return out;
}
