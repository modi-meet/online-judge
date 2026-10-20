import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { connect, disconnect, UserModel } from '@oj/db';
import { FileAdapter } from './adapters/file.js';
import { ingest } from './ingest.js';

// the ingestor is a job, not a service: run it, read the summary, exit.
//   pnpm --filter @oj/ingestor ingest -- --file data/sample-bundle.json --setter setter --public
loadEnv({ path: new URL('../../../.env', import.meta.url) });
const Env = z.object({ MONGO_URI: z.string().min(1) });
const env = Env.safeParse(process.env);
if (!env.success) { console.error('MONGO_URI is required'); process.exit(1); }

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i === -1 ? undefined : process.argv[i + 1]; };
const file = arg('file'); const setter = arg('setter') ?? 'setter'; const site = arg('site');
const makePublic = process.argv.includes('--public');
if (!file) { console.error('usage: ingest --file <bundle.json> [--site name] [--setter username] [--public]'); process.exit(2); }

await connect(env.data.MONGO_URI);
const owner = await UserModel.findOne({ username: setter, role: { $in: ['setter', 'admin'] } }).select('_id').lean();
if (!owner) { console.error(`no setter named ${setter}; seed first or pass --setter`); await disconnect(); process.exit(1); }
const adapter = await FileAdapter.open(file, site);
const r = await ingest(adapter, { createdBy: owner._id, makePublic });
console.log(`${adapter.site}: ${r.inserted} inserted, ${r.updated} updated, ${r.unchanged} unchanged, ${r.failed.length} failed`);
for (const f of r.failed) console.log(`  ${f.externalId}: ${f.error}`);
await disconnect();
process.exit(r.failed.length ? 1 : 0);
