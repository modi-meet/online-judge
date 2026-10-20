import { Redis } from 'ioredis';
import { Envelope } from '@oj/contracts';
import type { EventTransport, Subscription } from './transport.js';

const stream = (topic: string) => `events:${topic}`;

export class RedisStreamsTransport implements EventTransport {
  private readonly pub: Redis;
  private readonly subs: Redis[] = [];

  constructor(private readonly url: string, private readonly opts: { maxLen?: number; blockMs?: number; claimIdleMs?: number } = {}) {
    this.pub = new Redis(url, { maxRetriesPerRequest: 2 });
  }

  async publish(topic: string, key: string, envelope: Envelope) {
    // capped stream: a contest's worth of events is tiny, but a stuck consumer must not fill redis
    await this.pub.xadd(stream(topic), 'MAXLEN', '~', String(this.opts.maxLen ?? 100_000), '*', 'key', key, 'envelope', JSON.stringify(envelope));
  }

  subscribe(topic: string, group: string, consumer: string, handler: (envelope: Envelope, key: string) => Promise<void>): Subscription {
    const conn = new Redis(this.url, { maxRetriesPerRequest: null });
    this.subs.push(conn);
    let running = true;
    const s = stream(topic);

    const loop = async () => {
      await conn.xgroup('CREATE', s, group, '0', 'MKSTREAM').catch((e: Error) => { if (!e.message.includes('BUSYGROUP')) throw e; });
      while (running) {
        // first reclaim anything a dead consumer left pending, then read new entries
        try {
          const claimed = (await conn.xautoclaim(s, group, consumer, this.opts.claimIdleMs ?? 60_000, '0-0', 'COUNT', 50)) as [string, [string, string[]][]];
          for (const entry of claimed[1] ?? []) await this.handle(conn, s, group, entry, handler);
          const res = (await conn.xreadgroup('GROUP', group, consumer, 'COUNT', 100, 'BLOCK', this.opts.blockMs ?? 5_000, 'STREAMS', s, '>')) as [string, [string, string[]][]][] | null;
          for (const [, entries] of res ?? []) for (const entry of entries) await this.handle(conn, s, group, entry, handler);
        } catch (e) {
          if (!running) break;
          await new Promise((r) => setTimeout(r, 1_000));
          void e;
        }
      }
    };
    const done = loop();
    return { stop: async () => { running = false; conn.disconnect(); await done.catch(() => undefined); } };
  }

  private async handle(conn: Redis, s: string, group: string, [id, fields]: [string, string[]], handler: (e: Envelope, k: string) => Promise<void>) {
    const f: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) f[fields[i]!] = fields[i + 1]!;
    const parsed = Envelope.safeParse(JSON.parse(f['envelope'] ?? '{}'));
    if (parsed.success) {
      // a throwing handler leaves the entry pending; it is reclaimed and retried
      await handler(parsed.data, f['key'] ?? '');
    }
    await conn.xack(s, group, id);     // malformed entries are acked so they cannot poison the group
  }

  async close() {
    this.pub.disconnect();
    for (const c of this.subs) c.disconnect();
  }
}
