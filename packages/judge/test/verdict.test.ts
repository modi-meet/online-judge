import { describe, expect, it } from 'vitest';
import type { ExecResult } from '@oj/sandbox';
import { mapOutcome } from '../src/index.js';

const ok: ExecResult = { outcome: 'exited', exitCode: 0, signal: null, cpuMs: 10, wallMs: 12, peakMemKb: 1000, stdout: '1\n', stderr: '', stdoutTruncated: false, compileError: null };
const L = { cpuMs: 1000 };

describe('outcome → verdict', () => {
  it('clean run is undecided (comparator decides)', () => expect(mapOutcome(ok, L)).toBeNull());
  it('compile error', () => expect(mapOutcome({ ...ok, compileError: 'x' }, L)).toBe('CE'));
  it('spawn error is ours', () => expect(mapOutcome({ ...ok, outcome: 'spawn_error' }, L)).toBe('IE'));
  it('oom wins over timeout', () => expect(mapOutcome({ ...ok, outcome: 'oom', cpuMs: 5000 }, L)).toBe('MLE'));
  it('wall timeout', () => expect(mapOutcome({ ...ok, outcome: 'timeout' }, L)).toBe('TLE'));
  it('cpu over limit without a kill is still tle', () => expect(mapOutcome({ ...ok, cpuMs: 1001 }, L)).toBe('TLE'));
  it('truncated output', () => expect(mapOutcome({ ...ok, stdoutTruncated: true }, L)).toBe('OLE'));
  it('signal is re', () => expect(mapOutcome({ ...ok, exitCode: null, signal: 'SIGSEGV' }, L)).toBe('RE'));
  it('non-zero exit is re', () => expect(mapOutcome({ ...ok, exitCode: 1 }, L)).toBe('RE'));
});
