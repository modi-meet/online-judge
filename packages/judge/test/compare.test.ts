import { describe, expect, it } from 'vitest';
import { exact, float, trim } from '../src/index.js';

// lld §7.3 edge-case table. each row is a test; they ship before the comparator does.
describe('trim (default)', () => {
  it('accepts a missing trailing newline', () => expect(trim('42', '42\n')).toBe(true));
  it('accepts windows line endings', () => expect(trim('1\r\n2\r\n', '1\n2\n')).toBe(true));
  it('accepts trailing spaces on a line', () => expect(trim('1 2   \n3\t\n', '1 2\n3\n')).toBe(true));
  it('accepts an extra blank line at eof', () => expect(trim('a\nb\n\n\n', 'a\nb\n')).toBe(true));
  it('rejects a blank line in the middle', () => expect(trim('a\n\nb\n', 'a\nb\n')).toBe(false));
  it('rejects 1.0 vs 1', () => expect(trim('1.0\n', '1\n')).toBe(false));
  it('rejects leading spaces', () => expect(trim(' 1\n', '1\n')).toBe(false));
  it('rejects different content', () => expect(trim('1\n', '2\n')).toBe(false));
  it('accepts identical multi-line output', () => expect(trim('1 2\n3 4\n', '1 2\n3 4\n')).toBe(true));
});

describe('exact', () => {
  it('rejects a missing trailing newline', () => expect(exact('42', '42\n')).toBe(false));
  it('rejects crlf', () => expect(exact('1\r\n', '1\n')).toBe(false));
  it('accepts byte equality', () => expect(exact('1\n', '1\n')).toBe(true));
});

describe('float', () => {
  it('accepts 1.0 vs 1', () => expect(float('1.0', '1')).toBe(true));
  it('accepts -0.0 vs 0.0', () => expect(float('-0.0', '0.0')).toBe(true));
  it('accepts within absolute eps', () => expect(float('3.1415929', '3.1415926')).toBe(true));
  it('accepts within relative eps on large numbers', () => expect(float('1000000.5', '1000001.0')).toBe(true));
  it('rejects outside eps', () => expect(float('3.15', '3.14')).toBe(false));
  it('rejects a token count mismatch', () => expect(float('1 2', '1 2 3')).toBe(false));
  it('nan and inf are not numbers: compared as strings, never within eps', () => {
    expect(float('nan', '0')).toBe(false);
    expect(float('inf', '1e308')).toBe(false);
    expect(float('nan', 'nan')).toBe(true);
  });
  it('compares non-numeric tokens as strings', () => {
    expect(float('YES 1.0', 'YES 1')).toBe(true);
    expect(float('YES', 'NO')).toBe(false);
  });
  it('ignores whitespace layout', () => expect(float('1.0\n2.0\n', '1  2')).toBe(true));
});
