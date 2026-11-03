// vercel entry: the express app from src/server.ts without the listener, the
// websocket upgrade or the queue-depth timer. a function cannot hold a socket
// open, so live standings use the web's http poll here. judging still happens
// in a judge-worker that runs where docker does, on the same mongo and redis.
import { connect } from '@oj/db';
import { judgeQueue } from '@oj/queue';
import { DockerExecutor } from '@oj/sandbox';
import { storeFromEnv } from '@oj/storage';
import { createApp } from '../dist/app.js';
import { config } from '../dist/config.js';
import { redis } from '../dist/redis.js';

await connect(config.MONGO_URI);
await redis.connect().catch(() => undefined);

const executor = new DockerExecutor({ imageTag: config.SANDBOX_IMAGE_TAG });
// only /tmp is writable in a function; set the s3 vars for anything durable
const store = storeFromEnv({ FILE_STORE_ROOT: '/tmp/oj-store', ...process.env });
export default createApp({ executor, queue: judgeQueue(config.REDIS_URL), store });
