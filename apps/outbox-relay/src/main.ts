import { config as loadEnv } from 'dotenv';
import pino from 'pino';
import { z } from 'zod';
import { connect, disconnect } from '@oj/db';
import { RedisStreamsTransport, startRelay } from '@oj/events';

loadEnv({ path: new URL('../../../.env', import.meta.url) });
const env = z.object({ NODE_ENV: z.string().default('development'), MONGO_URI: z.string().min(1), REDIS_URL: z.string().min(1), LOG_LEVEL: z.string().default('info') }).safeParse(process.env);
if (!env.success) { console.error('invalid environment:', env.error.issues.map((i) => i.path.join('.')).join(', ')); process.exit(1); }
const log = pino({ level: env.data.LOG_LEVEL, ...(env.data.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}) });

// moves outbox rows onto the event log. the only process that publishes.
await connect(env.data.MONGO_URI);
const transport = new RedisStreamsTransport(env.data.REDIS_URL);
const relay = startRelay(transport, 500, (e) => log.error({ err: e.message }, 'relay tick failed'));
log.info('outbox relay running');

const shutdown = async () => { await relay.stop(); await transport.close(); await disconnect(); process.exit(0); };
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
