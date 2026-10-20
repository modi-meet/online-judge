import { hostname } from 'node:os';
import { config as loadEnv } from 'dotenv';
import { Redis } from 'ioredis';
import pino from 'pino';
import { z } from 'zod';
import { SubmissionJudged, TOPICS } from '@oj/contracts';
import { ContestModel, connect, disconnect } from '@oj/db';
import { RedisStreamsTransport } from '@oj/events';
import { myRank, projectVerdict, score, type UserState } from '@oj/judge';

loadEnv({ path: new URL('../../../.env', import.meta.url) });
const env = z.object({ NODE_ENV: z.string().default('development'), MONGO_URI: z.string().min(1), REDIS_URL: z.string().min(1), LOG_LEVEL: z.string().default('info') }).safeParse(process.env);
if (!env.success) { console.error('invalid environment:', env.error.issues.map((i) => i.path.join('.')).join(', ')); process.exit(1); }
const log = pino({ level: env.data.LOG_LEVEL, ...(env.data.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}) });

// consumes submission.judged and keeps the standings zset. lld §9.2. a replay
// from the start of the stream rebuilds the identical board — there is no
// backup to restore, only the log to replay.
await connect(env.data.MONGO_URI);
const redis = new Redis(env.data.REDIS_URL);
const transport = new RedisStreamsTransport(env.data.REDIS_URL);
const contests = new Map<string, { startAt: Date; endAt: Date }>();

const sub = transport.subscribe(TOPICS.submissionJudged, 'leaderboard-projector', `${hostname()}:${process.pid}`, async (envelope) => {
  const p = SubmissionJudged.safeParse(envelope.payload);
  if (!p.success || !p.data.contestId) return;
  const { contestId, userId, problemId, status, submittedAt } = p.data;
  let c = contests.get(contestId);
  if (!c) {
    const row = await ContestModel.findById(contestId).select('startAt endAt').lean();
    if (!row) return;
    c = { startAt: row.startAt, endAt: row.endAt };
    contests.set(contestId, c);
  }
  const at = new Date(submittedAt);
  if (at > c.endAt) return;
  const changed = await projectVerdict(redis, contestId, userId, envelope.eventId, { problemId, status, submittedAt: at }, c.startAt);
  if (!changed) return;
  // push a delta for the websocket layer. seq lets a client detect a gap and re-snapshot.
  const raw = await redis.hget(`contest:${contestId}:user:${userId}`, 'state');
  const s = score(raw ? (JSON.parse(raw) as UserState) : { problems: {} });
  const seq = await redis.incr(`contest:${contestId}:seq`);
  await redis.publish(`contest:${contestId}:delta`, JSON.stringify({ seq, userId, rank: await myRank(redis, contestId, userId), solved: s.solved, penalty: s.penalty, problemId, status }));
  log.info({ contestId, userId, status, seq }, 'projected');
});
log.info('leaderboard projector running');

const shutdown = async () => { await sub.stop(); await transport.close(); redis.disconnect(); await disconnect(); process.exit(0); };
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
