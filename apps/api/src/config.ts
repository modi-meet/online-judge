import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// the .env lives at the repo root; services run from their own folder. real
// env always wins over the file.
loadEnv({ path: new URL('../../../.env', import.meta.url) });

// every service validates its own env at boot and exits non-zero on a missing
// variable. failing in the deploy beats failing on the first request.
const Env = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    MONGO_URI: z.string().min(1),
    REDIS_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
    ACCESS_TTL_SEC: z.coerce.number().int().default(15 * 60),
    REFRESH_TTL_SEC: z.coerce.number().int().default(30 * 24 * 3600),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    ALLOW_HOST_EXECUTOR: z.enum(['true', 'false']).default('false'),
    LOG_LEVEL: z.string().default('info'),
  })
  .refine((e) => !(e.NODE_ENV === 'production' && e.ALLOW_HOST_EXECUTOR === 'true'), {
    message: 'ALLOW_HOST_EXECUTOR cannot be true in production (lld §6.6)',
  });

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  console.error('invalid environment:');
  for (const i of parsed.error.issues) console.error(`  ${i.path.join('.') || '(root)'}: ${i.message}`);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
