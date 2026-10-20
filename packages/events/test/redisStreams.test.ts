import { afterAll, describe, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import type { Envelope } from '@oj/contracts';
import { RedisStreamsTransport } from '../src/index.js';

const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379/2';
const t = new RedisStreamsTransport(url, { blockMs: 300, claimIdleMs: 500 });
const admin = new Redis(url);
const env = (n: number): Envelope => ({ eventId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, type: 'test.event', version: 1, occurredAt: new Date().toISOString(), producer: 'test', payload: { n } });

afterAll(async () => { await t.close(); admin.disconnect(); });

describe('redis streams transport', () => {
  it('delivers published events to a consumer group in order', async () => {
    await admin.del('events:t1');
    const got: number[] = [];
    const sub = t.subscribe('t1', 'g', 'c1', async (e) => { got.push((e.payload as { n: number }).n); });
    for (let i = 0; i < 5; i++) await t.publish('t1', 'k', env(i));
    await new Promise((r) => setTimeout(r, 800));
    await sub.stop();
    expect(got).toEqual([0, 1, 2, 3, 4]);
  });

  it('a failing handler leaves the entry pending and it is redelivered', async () => {
    await admin.del('events:t2');
    let attempts = 0;
    const sub = t.subscribe('t2', 'g', 'c1', async () => { attempts++; if (attempts === 1) throw new Error('flaky'); });
    await t.publish('t2', 'k', env(1));
    await new Promise((r) => setTimeout(r, 1_800));
    await sub.stop();
    expect(attempts).toBeGreaterThanOrEqual(2);
  });

  it('two consumers in one group split the work, two groups each see everything', async () => {
    await admin.del('events:t3');
    const a: number[] = []; const b: number[] = []; const other: number[] = [];
    const s1 = t.subscribe('t3', 'g', 'c1', async (e) => { a.push((e.payload as { n: number }).n); });
    const s2 = t.subscribe('t3', 'g', 'c2', async (e) => { b.push((e.payload as { n: number }).n); });
    const s3 = t.subscribe('t3', 'audit', 'c1', async (e) => { other.push((e.payload as { n: number }).n); });
    for (let i = 0; i < 10; i++) await t.publish('t3', 'k', env(i));
    await new Promise((r) => setTimeout(r, 1_000));
    await Promise.all([s1.stop(), s2.stop(), s3.stop()]);
    expect([...a, ...b].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(other.sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
