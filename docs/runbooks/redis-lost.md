# redis lost or flushed

**symptom.** leaderboards empty, every request suddenly rate-limited or none are, sse streams quiet, the api log full of `redis error`.

**what depends on redis.** the queue (bullmq), the rate limiter (fails open on error — by design, lld §4.3), the verdict pub/sub behind sse (the client falls back to polling), the outbox stream and consumer groups, the standings projection, the mentor's budget and cache, idempotency keys. mongo is the source of truth for all of it except the queue.

**check.**
1. `redis-cli ping` from the api host. `INFO keyspace` — an empty keyspace after a restart means persistence was off or the volume was lost.
2. `XINFO GROUPS submission.judged` — the consumer groups must exist; the relay and projector recreate them on start (`MKSTREAM`), so restart those two if they are missing.

**do.**
- queue lost: in-flight submissions are still QUEUED in mongo. the sweeper requeues them within five minutes; or run it now by restarting a worker.
- standings lost: `POST /api/contests/:id/rebuild` per running contest. it replays the submissions log in order and is idempotent. verify with `chaos/redis-flush.sh`.
- outbox stream lost: the outbox rows with `sentAt: null` are re-sent by the relay automatically; rows already sent are not replayed (the projector would skip them anyway via the seen set, which is also gone — a rebuild covers this).
- rate limiter open: it heals itself as soon as redis is back; nothing to do.
