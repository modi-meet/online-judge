import { cpus, hostname } from 'node:os';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv({ path: new URL('../../../.env', import.meta.url) });

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SANDBOX_IMAGE_TAG: z.string().min(1).refine((t) => t !== 'latest', 'latest is banned; pin a tag'),
  // n = cores - 2: two cores stay for the daemon, the agent and this event loop
  JUDGE_SLOTS: z.coerce.number().int().min(1).default(Math.max(1, cpus().length - 2)),
  JUDGE_CPUSET_BASE: z.coerce.number().int().min(0).default(0),
  // pinning only makes sense on a linux host; inside the docker vm the core ids do not map
  JUDGE_PIN_CORES: z.enum(['true', 'false']).default('false'),
  JUDGE_SCRATCH_ROOT: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  console.error('invalid environment:');
  for (const i of parsed.error.issues) console.error(`  ${i.path.join('.') || '(root)'}: ${i.message}`);
  process.exit(1);
}
export const config = { ...parsed.data, workerId: `${hostname()}:${process.pid}` };
