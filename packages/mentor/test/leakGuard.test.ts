import { describe, expect, it } from 'vitest';
import { leakGuard, normalize } from '../src/index.js';

const solution = '```python\nimport sys\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    a = list(map(int, data[1:]))\n    best = a[0]\n    cur = 0\n    for x in a:\n        cur = max(x, cur + x)\n        best = max(best, cur)\n    print(best)\nmain()\n```';

describe('leak guard', () => {
  it('blocks a complete solution in the user language (rule a)', () => {
    expect(leakGuard(`here you go:\n${solution}`, { language: 'python3' })).toEqual({ blocked: true, rule: 'A' });
  });
  it('lets a short helper through', () => {
    const r = leakGuard('try keeping a running sum:\n```python\ncur = max(x, cur + x)\n```', { language: 'python3' });
    expect(r.blocked).toBe(false);
  });
  it('lets prose with no code through', () => {
    expect(leakGuard('think about what invariant the running sum keeps when you reset it.', { language: 'cpp17' }).blocked).toBe(false);
  });
  it('an unfenced language tag still counts as the user language', () => {
    expect(leakGuard(solution.replace('```python', '```'), { language: 'python3' }).rule).toBe('A');
  });
  it('blocks an identifier-renamed copy of an editorial (rule b)', () => {
    const editorial = 'def main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    a = list(map(int, data[1:]))\n    best = a[0]\n    cur = 0\n    for x in a:\n        cur = max(x, cur + x)\n        best = max(best, cur)\n    print(best)';
    const renamed = editorial.replace(/best/g, 'answer').replace(/cur/g, 'running');
    expect(leakGuard(renamed, { language: 'cpp17', editorials: [editorial] }).rule).toBe('B');
  });
  it('normalize renames identifiers positionally', () => {
    expect(normalize('foo = bar + 1')).toBe(normalize('x = y + 1'));
  });
});
