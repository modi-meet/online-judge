import { describe, expect, it } from 'vitest';
import { problemRating, rank, ratingDeltas, rng, solveChance } from '../src/sim.js';

describe('demo simulation', () => {
  it('the generator is reproducible', () => {
    const a = rng(42); const b = rng(42);
    expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
  });
  it('problem ratings stay inside their band', () => {
    for (const id of ['a', 'bb', 'ccc', 'dddd']) {
      expect(problemRating(id, 'easy')).toBeGreaterThanOrEqual(800); expect(problemRating(id, 'easy')).toBeLessThanOrEqual(1300);
      expect(problemRating(id, 'hard')).toBeGreaterThanOrEqual(1900);
    }
  });
  it('stronger people solve more', () => {
    expect(solveChance(2000, 1600)).toBeGreaterThan(solveChance(1300, 1600));
  });
  it('ties share a rank and the next rank skips', () => {
    const r = rank([{ userId: 'a', solved: 3, penalty: 50 }, { userId: 'b', solved: 3, penalty: 50 }, { userId: 'c', solved: 2, penalty: 10 }]);
    expect([r.get('a'), r.get('b'), r.get('c')]).toEqual([1, 1, 3]);
  });
  it('beating a higher-rated field gains more than beating a lower one, and deltas roughly cancel', () => {
    const ratings = new Map([['a', 1400], ['b', 1800], ['c', 1600]]);
    const ranks = new Map([['a', 1], ['b', 2], ['c', 3]]);
    const d = ratingDeltas(ratings, ranks, new Map([['a', 5], ['b', 5], ['c', 5]]));
    expect(d.get('a')!).toBeGreaterThan(0);
    expect(d.get('c')!).toBeLessThan(0);
    expect(Math.abs(d.get('a')! + d.get('b')! + d.get('c')!)).toBeLessThanOrEqual(2);
  });
});
