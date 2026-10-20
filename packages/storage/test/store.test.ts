import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileStore, putOrInline } from '../src/index.js';

describe('file store', () => {
  it('round-trips and reads inline refs too', async () => {
    const s = new FileStore(await mkdtemp(join(tmpdir(), 'oj-store-')));
    const ref = await s.put('code/abc.cpp', 'int main(){}');
    expect(ref).toBe('file:code/abc.cpp');
    expect(await s.get(ref)).toBe('int main(){}');
    expect(await s.get('inline:hello')).toBe('hello');
    await s.del(ref);
    await expect(s.get(ref)).rejects.toThrow();
  });
  it('refuses keys that escape the root', async () => {
    const s = new FileStore(await mkdtemp(join(tmpdir(), 'oj-store-')));
    await expect(s.put('../../etc/passwd', 'x')).rejects.toThrow(/escapes/);
  });
  it('keeps small values inline and stores big ones', async () => {
    const s = new FileStore(await mkdtemp(join(tmpdir(), 'oj-store-')));
    expect(await putOrInline(s, 'k', 'tiny')).toBe('inline:tiny');
    expect(await putOrInline(s, 'k', 'x'.repeat(5000))).toBe('file:k');
  });
});
