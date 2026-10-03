import { describe, expect, it } from 'vitest';
import {
  Envelope,
  HTTP_STATUS,
  ErrorCode,
  LANGUAGES,
  LANGUAGE_SPEC,
  PENALISED,
  PENDING,
  RunBody,
  STATUSES,
  SubmitBody,
  TERMINAL,
  isPending,
  isTerminal,
} from '../src/index.js';

describe('verdict vocabulary', () => {
  it('pending and terminal do not overlap and cover every status', () => {
    const overlap = PENDING.filter((s) => (TERMINAL as readonly string[]).includes(s));
    expect(overlap).toEqual([]);
    expect(STATUSES).toHaveLength(PENDING.length + TERMINAL.length);
  });
  it('classifies statuses', () => {
    expect(isTerminal('AC')).toBe(true);
    expect(isTerminal('RUNNING')).toBe(false);
    expect(isPending('QUEUED')).toBe(true);
  });
  it('ce and ie never count as a penalised attempt', () => {
    expect(PENALISED).not.toContain('CE');
    expect(PENALISED).not.toContain('IE');
    expect(PENALISED).toContain('WA');
  });
});

describe('language registry', () => {
  it('has a spec for every language', () => {
    for (const l of LANGUAGES) expect(LANGUAGE_SPEC[l]).toBeDefined();
  });
  it('forces Main.java so the public class matches the file name', () => {
    expect(LANGUAGE_SPEC.java17.file).toBe('Main.java');
  });
});

describe('request bodies', () => {
  it('rejects oversize source', () => {
    const r = SubmitBody.safeParse({ problemId: 'a'.repeat(24), language: 'cpp17', code: 'x'.repeat(70_000) });
    expect(r.success).toBe(false);
  });
  it('defaults stdin to empty', () => {
    const r = RunBody.parse({ language: 'python3', code: 'print(1)' });
    expect(r.stdin).toBe('');
  });
  it('rejects a malformed object id', () => {
    expect(SubmitBody.safeParse({ problemId: 'nope', language: 'c', code: 'x' }).success).toBe(false);
  });
});

describe('error codes', () => {
  it('every code maps to an http status', () => {
    for (const c of ErrorCode.options) expect(HTTP_STATUS[c]).toBeGreaterThanOrEqual(400);
  });
});

describe('event envelope', () => {
  it('round-trips a valid envelope', () => {
    const e = Envelope.parse({
      eventId: '7f4e4a1e-2b7b-4d0b-9a2a-2c3d4e5f6a7b',
      type: 'submission.judged',
      version: 1,
      occurredAt: new Date().toISOString(),
      producer: 'judge-worker@test',
      payload: {},
    });
    expect(e.version).toBe(1);
  });
});
