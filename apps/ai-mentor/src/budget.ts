import { createHash } from 'node:crypto';
import type { Redis } from 'ioredis';
import { normalize } from '@oj/mentor';
import { config } from './config.js';

// the budget is the one thing standing between a public endpoint and an llm
// bill. a day is a calendar day in utc; keys expire two days later so a
// clock skew never leaves them orphaned.
const day = () => new Date().toISOString().slice(0, 10);
const TTL = 2 * 24 * 3600;

export const PER_USER_SHARE = 0.1;

export class Budget {
  constructor(private readonly redis: Redis) {}

  async check(userId: string) {
    const [g, u] = await this.redis.mget(`ai:tokens:${day()}`, `ai:tokens:${day()}:${userId}`);
    const globalUsed = Number(g ?? 0); const userUsed = Number(u ?? 0);
    const userCap = Math.floor(config.AI_DAILY_TOKEN_CAP * PER_USER_SHARE);
    if (globalUsed >= config.AI_DAILY_TOKEN_CAP) return { ok: false as const, reason: 'the mentor is out of tokens for today', remaining: 0 };
    if (userUsed >= userCap) return { ok: false as const, reason: 'you have used your share of the mentor for today', remaining: 0 };
    return { ok: true as const, remaining: Math.min(config.AI_DAILY_TOKEN_CAP - globalUsed, userCap - userUsed) };
  }

  /** output tokens are what cost; input is cached and mostly ours */
  async charge(userId: string, tokens: number) {
    const m = this.redis.multi();
    m.incrby(`ai:tokens:${day()}`, tokens).expire(`ai:tokens:${day()}`, TTL);
    m.incrby(`ai:tokens:${day()}:${userId}`, tokens).expire(`ai:tokens:${day()}:${userId}`, TTL);
    await m.exec();
  }
}

/** identical question → identical answer, free. keyed on the normalized code
 * so a renamed variable or a reflowed comment does not miss. */
export class ReplyCache {
  constructor(private readonly redis: Redis, private readonly ttlSec = 24 * 3600) {}
  key(problemId: string, mode: number, code: string) {
    return `ai:cache:${createHash('sha256').update(`${problemId}|${mode}|${normalize(code)}`).digest('hex')}`;
  }
  get(k: string) { return this.redis.get(k); }
  async set(k: string, text: string) { await this.redis.set(k, text, 'EX', this.ttlSec); }
}
