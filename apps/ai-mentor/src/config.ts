import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv({ path: new URL('../../../.env', import.meta.url) });

// the mentor is its own process on its own port. the api never learns it
// exists; the gateway routes /api/ai here (hld §8.8).
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4002),
  /** read-only credential. in production this user has find on problems,
   * testcases, submissions, contests and nothing else. locally it falls back
   * to MONGO_URI, and the process still never issues a write. */
  MONGO_URI_RO: z.string().optional(),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AI_ENABLED: z.enum(['true', 'false']).default('false'),
  AI_PROVIDER: z.enum(['anthropic', 'fake', '']).default(''),
  AI_API_KEY: z.string().default(''),
  AI_MODEL_STRONG: z.string().default('claude-opus-5-5'),
  AI_MODEL_FAST: z.string().default('claude-haiku-5-5'),
  /** output tokens per calendar day across every user; the per-user cap is a tenth of it */
  AI_DAILY_TOKEN_CAP: z.coerce.number().int().default(150_000),
  SANDBOX_IMAGE_TAG: z.string().min(1).default('dev'),
  JUDGE_SCRATCH_ROOT: z.string().optional().transform((s) => s || undefined),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  console.error('invalid environment:');
  for (const i of parsed.error.issues) console.error(`  ${i.path.join('.') || '(root)'}: ${i.message}`);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  mongoUri: parsed.data.MONGO_URI_RO || parsed.data.MONGO_URI,
  // no key means the fake provider, whatever AI_PROVIDER says. a dev box
  // should never silently bill a real account.
  provider: parsed.data.AI_API_KEY && parsed.data.AI_PROVIDER !== 'fake' ? ('anthropic' as const) : ('fake' as const),
};
export type Config = typeof config;
