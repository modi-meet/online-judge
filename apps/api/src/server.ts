import { connect } from '@oj/db';
import { HostExecutor } from '@oj/sandbox';
import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { redis } from './redis.js';

await connect(config.MONGO_URI);
await redis.connect().catch((e) => logger.warn({ err: e.message }, 'redis not reachable at boot'));

// v0: host executor, local dev only. v1 swaps in the docker runner. the guard
// inside HostExecutor refuses to construct anywhere else.
const executor = new HostExecutor();

const app = createApp({ executor });
app.listen(config.PORT, () => logger.info({ port: config.PORT, executor: executor.kind }, 'api listening'));
