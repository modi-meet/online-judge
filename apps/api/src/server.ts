import { connect } from '@oj/db';
import { createServer } from 'node:http';
import { judgeQueue } from '@oj/queue';
import { DockerExecutor } from '@oj/sandbox';
import { storeFromEnv } from '@oj/storage';
import { metrics } from '@oj/telemetry';
import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { redis } from './redis.js';
import { attachWebSockets } from './ws.js';

await connect(config.MONGO_URI);
await redis.connect().catch((e) => logger.warn({ err: e.message }, 'redis not reachable at boot'));

// /run and the judge share the docker runner. the v0 host executor is gone (lld §6.6).
const executor = new DockerExecutor({ imageTag: config.SANDBOX_IMAGE_TAG, scratchRoot: config.JUDGE_SCRATCH_ROOT || undefined });

const queue = judgeQueue(config.REDIS_URL);
setInterval(() => { queue.getWaitingCount().then((n) => metrics.queueDepth.set(n)).catch(() => undefined); }, 5_000).unref();
const store = storeFromEnv(process.env);
const app = createApp({ executor, queue, store });
const server = createServer(app);
attachWebSockets(server);
server.listen(config.PORT, () => logger.info({ port: config.PORT, executor: executor.kind, store: store.scheme }, 'api listening'));
