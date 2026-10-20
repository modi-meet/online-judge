import { Redis } from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

export const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
redis.on('error', (e) => logger.warn({ err: e.message }, 'redis error'));
