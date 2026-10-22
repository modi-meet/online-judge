import type { RequestHandler } from 'express';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { redis } from '../redis.js';

// token bucket, atomic in redis via lua. a get-then-set from node races under
// exactly the load that matters. lld §4.3
const SCRIPT = `
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local cap = tonumber(ARGV[1]); local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3]); local cost = tonumber(ARGV[4])
local tokens = tonumber(b[1]); if tokens == nil then tokens = cap end
local ts = tonumber(b[2]); if ts == nil then ts = now end
local elapsed = math.max(0, now - ts) / 1000
tokens = math.min(cap, tokens + elapsed * rate)
if tokens < cost then
  return {0, math.ceil((cost - tokens) / rate)}
end
redis.call('HMSET', KEYS[1], 'tokens', tokens - cost, 'ts', now)
redis.call('EXPIRE', KEYS[1], 3600)
return {1, 0}
`;

export interface Bucket {
  /** burst size */
  capacity: number;
  /** tokens added per second */
  refillPerSec: number;
}

export const BUCKETS = {
  run: { capacity: 10, refillPerSec: 1 / 6 },
  submit: { capacity: 20, refillPerSec: 1 / 3 },
  ai: { capacity: 6, refillPerSec: 1 / 30 },
  login: { capacity: 5, refillPerSec: 1 / 60 },
  default: { capacity: 300, refillPerSec: 5 },
} satisfies Record<string, Bucket>;

export function rateLimit(name: keyof typeof BUCKETS): RequestHandler {
  const b = BUCKETS[name];
  return async (req, res, next) => {
    const who = req.user?.sub ?? req.ip ?? 'anon';
    try {
      const [ok, retry] = (await redis.eval(SCRIPT, 1, `rl:${name}:${who}`, b.capacity, b.refillPerSec, Date.now(), 1)) as [number, number];
      if (ok === 1) return next();
      res.setHeader('retry-after', String(retry));
      return next(new AppError('RATE_LIMITED', 'Too many requests', { retryAfterSec: retry }));
    } catch (e) {
      // redis down must not take down login. fail open, log it. the queue is the real backpressure.
      logger.warn({ err: (e as Error).message }, 'rate limiter unavailable, failing open');
      return next();
    }
  };
}
