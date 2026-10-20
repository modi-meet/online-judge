import { describe, expect, it } from 'vitest';
import { applyVerdict, score, unpack, type UserState } from '../src/index.js';

const start = new Date('2026-10-20T10:00:00Z');
const at = (min: number) => new Date(start.getTime() + min * 60_000);
const empty: UserState = { problems: {} };

describe('icpc scoring', () => {
  it('an ac at minute 12 scores 1 solved, 12 penalty', () => {
    const s = applyVerdict(empty, { problemId: 'A', status: 'AC', submittedAt: at(12) }, start);
    expect(score(s)).toEqual({ solved: 1, penalty: 12, zscore: 1e9 - 12 });
  });
  it('wrong attempts before the ac cost 20 each', () => {
    let s = applyVerdict(empty, { problemId: 'A', status: 'WA', submittedAt: at(3) }, start);
    s = applyVerdict(s, { problemId: 'A', status: 'TLE', submittedAt: at(7) }, start);
    s = applyVerdict(s, { problemId: 'A', status: 'AC', submittedAt: at(30) }, start);
    expect(score(s).penalty).toBe(30 + 40);
  });
  it('ce and ie are not wrong attempts', () => {
    let s = applyVerdict(empty, { problemId: 'A', status: 'CE', submittedAt: at(1) }, start);
    s = applyVerdict(s, { problemId: 'A', status: 'IE', submittedAt: at(2) }, start);
    s = applyVerdict(s, { problemId: 'A', status: 'AC', submittedAt: at(5) }, start);
    expect(score(s).penalty).toBe(5);
  });
  it('wrong attempts on an unsolved problem cost nothing', () => {
    const s = applyVerdict(empty, { problemId: 'A', status: 'WA', submittedAt: at(3) }, start);
    expect(score(s)).toEqual({ solved: 0, penalty: 0, zscore: 0 });
  });
  it('anything after the first ac changes nothing', () => {
    const solved = applyVerdict(empty, { problemId: 'A', status: 'AC', submittedAt: at(5) }, start);
    expect(applyVerdict(solved, { problemId: 'A', status: 'WA', submittedAt: at(9) }, start)).toBe(solved);
    expect(applyVerdict(solved, { problemId: 'A', status: 'AC', submittedAt: at(9) }, start)).toBe(solved);
  });
  it('more solved always beats less penalty; ties go to lower penalty', () => {
    const two = score({ problems: { A: { solvedAt: 100, wrongBefore: 5 }, B: { solvedAt: 110, wrongBefore: 5 } } });
    const one = score({ problems: { A: { solvedAt: 1, wrongBefore: 0 } } });
    const oneLate = score({ problems: { A: { solvedAt: 2, wrongBefore: 0 } } });
    expect(two.zscore).toBeGreaterThan(one.zscore);
    expect(one.zscore).toBeGreaterThan(oneLate.zscore);
  });
  it('zscore round-trips through a double', () => {
    expect(unpack(score({ problems: { A: { solvedAt: 119, wrongBefore: 9 }, B: { solvedAt: 3, wrongBefore: 0 } } }).zscore)).toEqual({ solved: 2, penalty: 119 + 180 + 3 });
  });
});
