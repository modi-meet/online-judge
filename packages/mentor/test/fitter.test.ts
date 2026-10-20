import { describe, expect, it } from 'vitest';
import { fitGrowth } from '../src/index.js';

const gen = (f: (n: number) => number, sizes = [100, 1000, 10000, 100000]) => sizes.map((n) => ({ n, cpuMs: f(n) }));

describe('complexity fitter', () => {
  it('recognises linear', () => expect(fitGrowth(gen((n) => n * 0.01 + 5)).cls).toBe('O(n)'));
  it('recognises quadratic', () => expect(fitGrowth(gen((n) => (n * n) / 1e5 + 5)).cls).toBe('O(n²)'));
  it('recognises n log n', () => expect(fitGrowth(gen((n) => n * Math.log2(n) * 0.001 + 5)).cls).toBe('O(n log n)'));
  it('recognises cubic', () => expect(fitGrowth(gen((n) => (n ** 3) / 1e9 + 5, [100, 300, 1000, 3000])).cls).toBe('O(n³)'));
  it('recognises exponential', () => expect(fitGrowth(gen((n) => 2 ** (n / 2) + 5, [10, 20, 30, 40])).cls).toBe('exponential'));
  it('is inconclusive below the noise floor', () => {
    const f = fitGrowth(gen(() => 1));
    expect(f.cls).toBe('INCONCLUSIVE');
    expect(f.note).toMatch(/noise floor/);
  });
  it('is inconclusive on noise', () => {
    const f = fitGrowth([{ n: 100, cpuMs: 50 }, { n: 1000, cpuMs: 8 }, { n: 10000, cpuMs: 70 }, { n: 100000, cpuMs: 9 }]);
    expect(f.cls).toBe('INCONCLUSIVE');
  });
});
