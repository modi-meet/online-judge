import { Redis } from 'ioredis';
import pino from 'pino';
import { connect, disconnect } from '@oj/db';
import { judgeSubmission, sweepStuck } from '@oj/judge';
import { judgeQueue, judgeWorker, PRIORITY } from '@oj/queue';
import { DockerExecutor } from '@oj/sandbox';
import { storeFromEnv } from '@oj/storage';
import { config } from './config.js';

const log = pino({ level: config.LOG_LEVEL, ...(config.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}) });

await connect(config.MONGO_URI);
const pub = new Redis(config.REDIS_URL);
const queue = judgeQueue(config.REDIS_URL);
const store = storeFromEnv(process.env);
log.info({ store: store.scheme }, 'object store');

// one executor per slot, each pinned to its own core when the host allows it
const slots: DockerExecutor[] = [];
const free: number[] = [];
for (let i = 0; i < config.JUDGE_SLOTS; i++) {
  slots.push(new DockerExecutor({
    imageTag: config.SANDBOX_IMAGE_TAG,
    cpuset: config.JUDGE_PIN_CORES === 'true' ? String(config.JUDGE_CPUSET_BASE + i) : undefined,
    scratchRoot: config.JUDGE_SCRATCH_ROOT || undefined,
  }));
  free.push(i);
}
const waiters: ((i: number) => void)[] = [];
const acquire = () => new Promise<number>((res) => { const i = free.pop(); if (i !== undefined) res(i); else waiters.push(res); });
const release = (i: number) => { const w = waiters.shift(); if (w) w(i); else free.push(i); };

const worker = judgeWorker(config.REDIS_URL, config.JUDGE_SLOTS, async (job) => {
  const slot = await acquire();
  const started = Date.now();
  try {
    const verdict = await judgeSubmission(job.data.submissionId, {
      executor: slots[slot]!,
      workerId: config.workerId,
      store,
      publish: (id, ev) => pub.publish(`sub:${id}`, JSON.stringify(ev)).then(() => undefined),
    });
    log.info({ submissionId: job.data.submissionId, verdict, slot, ms: Date.now() - started, attempt: job.attemptsMade + 1 }, verdict ? 'judged' : 'skipped, already owned');
  } finally {
    release(slot);
  }
});
worker.on('failed', (job, err) => log.error({ submissionId: job?.data.submissionId, err: err.message, attempt: job?.attemptsMade }, 'judge failed'));
worker.on('error', (err) => log.error({ err: err.message }, 'worker error'));

const sweeper = setInterval(() => {
  sweepStuck((id) => queue.add('judge', { submissionId: id }, { jobId: `${id}:${Date.now()}`, priority: PRIORITY.practice }))
    .then((r) => { if (r.requeued || r.failed) log.warn(r, 'sweeper'); })
    .catch((e: Error) => log.error({ err: e.message }, 'sweeper failed'));
}, 60_000);

log.info({ slots: config.JUDGE_SLOTS, imageTag: config.SANDBOX_IMAGE_TAG, workerId: config.workerId }, 'judge worker ready');

const shutdown = async (sig: string) => {
  log.info({ sig }, 'draining');
  clearInterval(sweeper);
  await worker.close();
  await queue.close();
  pub.disconnect();
  await disconnect();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
