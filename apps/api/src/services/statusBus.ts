import { EventEmitter } from 'node:events';
import { Redis } from 'ioredis';
import { config } from '../config.js';
import { logger } from '../logger.js';

// one redis subscriber for the whole process, fanned out to sse handlers.
// pub/sub is fire-and-forget by design: mongo is the record, this is the nudge.
const bus = new EventEmitter();
bus.setMaxListeners(0);
let sub: Redis | null = null;

function ensure() {
  if (sub) return;
  sub = new Redis(config.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: null });
  sub.on('error', (e) => logger.warn({ err: e.message }, 'status bus redis error'));
  void sub.psubscribe('sub:*');
  sub.on('pmessage', (_pattern, channel, message) => {
    try { bus.emit(channel.slice(4), JSON.parse(message)); } catch { /* malformed, ignore */ }
  });
}

export function subscribe(submissionId: string, fn: (ev: { status: string; [k: string]: unknown }) => void) {
  ensure();
  bus.on(submissionId, fn);
  return () => bus.off(submissionId, fn);
}

export function closeStatusBus() { sub?.disconnect(); sub = null; }
