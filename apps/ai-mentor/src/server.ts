import { Redis } from 'ioredis';
import { connect } from '@oj/db';
import { DockerExecutor } from '@oj/sandbox';
import { createApp } from './app.js';
import { Budget, ConversationStore, ReplyCache } from './budget.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { providerFromConfig } from './provider.js';

// the intelligence plane. delete this process and the judge keeps judging.
await connect(config.mongoUri);
const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 1 });
redis.on('error', (e) => logger.warn({ err: e.message }, 'redis error'));

const executor = new DockerExecutor({ imageTag: config.SANDBOX_IMAGE_TAG, scratchRoot: config.JUDGE_SCRATCH_ROOT });
const app = createApp({ provider: providerFromConfig(), executor, budget: new Budget(redis), cache: new ReplyCache(redis), conversations: new ConversationStore(redis) });

app.listen(config.PORT, () => logger.info({ port: config.PORT, enabled: config.AI_ENABLED, provider: config.provider }, 'ai mentor listening'));
