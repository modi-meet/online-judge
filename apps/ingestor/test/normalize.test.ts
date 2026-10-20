import { describe, expect, it } from 'vitest';
import { difficultyOf, normalize, normalizeText, slugify } from '../src/normalize.js';

const raw = { externalId: 'x1', title: '  Count the Vowels!  ', statement: 'read a line\r\nprint a number', difficulty: 800, tags: ['Strings', 'strings', ' impl '], testcases: [{ input: 'ab\r\n', output: '1  ' }, { input: 'c', output: '0\n\n' }] };

describe('normalize', () => {
  it('slugs are lowercase, ascii, dashed', () => {
    expect(slugify('Count the Vowels!')).toBe('count-the-vowels');
    expect(slugify('  Ünïcode — Title  ')).toBe('unicode-title');
  });
  it('maps ratings onto the three buckets', () => {
    expect(difficultyOf(800)).toBe('easy'); expect(difficultyOf(1500)).toBe('medium'); expect(difficultyOf(2400)).toBe('hard');
    expect(difficultyOf('hard')).toBe('hard'); expect(difficultyOf(undefined)).toBe('medium');
  });
  it('normalizes crlf, trailing spaces and the final newline', () => {
    expect(normalizeText('a \r\nb\r\n\r\n')).toBe('a\nb\n');
    expect(normalizeText('x')).toBe('x\n');
  });
  it('produces a valid problem with deduped tags, inline cases and a set version', () => {
    const n = normalize(raw, 'test');
    expect(n.slug).toBe('count-the-vowels');
    expect(n.fields.difficulty).toBe('easy');
    expect(n.fields.tags).toEqual(['strings', 'impl']);
    expect(n.fields.statement).toBe('read a line\nprint a number');
    expect(n.testcases[0]).toEqual({ idx: 0, input: 'ab\n', output: '1\n', isSample: true });
    expect(n.testcases[1]!.isSample).toBe(false);
    expect(n.testcaseSetVersion).toHaveLength(16);
  });
  it('the version follows the cases, not the prose', () => {
    const a = normalize(raw, 'test');
    const b = normalize({ ...raw, title: 'renamed' }, 'test');
    const c = normalize({ ...raw, testcases: [...raw.testcases, { input: 'z', output: '0' }] }, 'test');
    expect(a.testcaseSetVersion).toBe(b.testcaseSetVersion);
    expect(a.testcaseSetVersion).not.toBe(c.testcaseSetVersion);
  });
  it('falls back to site-externalId when the title has no slug material', () => {
    expect(normalize({ ...raw, title: '!!!' }, 'cf').slug).toBe('cf-x1');
  });
  it('clamps limits into the allowed range', () => {
    const n = normalize({ ...raw, timeLimitMs: 50, memoryLimitMb: 99999 }, 'test');
    expect(n.fields.timeLimitMs).toBe(100); expect(n.fields.memoryLimitMb).toBe(1024);
  });
  it('refuses a problem without cases', () => {
    expect(() => normalize({ ...raw, testcases: [] }, 'test')).toThrow(/at least one/);
  });
});
