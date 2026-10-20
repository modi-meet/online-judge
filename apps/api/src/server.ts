import { connect } from '@oj/db';
import { judgeQueue } from '@oj/queue';
import { DockerExecutor } from '@oj/sandbox';
import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { redis } from './redis.js';

await connect(config.MONGO_URI);
await redis.connect().catch((e) => logger.warn({ err: e.message }, 'redis not reachable at boot'));

// /run and the judge share the docker runner. the v0 host executor is gone (lld §6.6).
const executor = new DockerExecutor({ imageTag: config.SANDBOX_IMAGE_TAG, scratchRoot: config.JUDGE_SCRATCH_ROOT || undefined });

const app = createApp({ executor, queue: judgeQueue(config.REDIS_URL) });
app.listen(config.PORT, () => logger.info({ port: config.PORT, executor: executor.kind }, 'api listening'));
