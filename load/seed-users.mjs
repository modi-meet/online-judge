#!/usr/bin/env node
// a load generator from one ip cannot register or log in more than five
// users a minute — the login bucket is per ip and that is the point of it.
// so the generator runs inside the trust boundary instead: it creates the
// user rows directly and mints the same hs256 access tokens the api would.
//   node load/seed-users.mjs --users 200   → writes load/.tokens.json
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { connect, disconnect, UserModel } from '../packages/db/dist/index.js';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i === -1 ? d : process.argv[i + 1]; };
const N = Number(arg('users', 50));
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
const SECRET = process.env.JWT_SECRET ?? env.JWT_SECRET;
const MONGO = process.env.MONGO_URI ?? env.MONGO_URI;
if (!SECRET || !MONGO) { console.error('need JWT_SECRET and MONGO_URI (env or .env)'); process.exit(1); }

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (sub) => {
  const now = Math.floor(Date.now() / 1000);
  const head = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'user', jti: randomBytes(8).toString('hex'), iat: now, exp: now + 4 * 3600 })}`;
  return `${head}.${createHmac('sha256', SECRET).update(head).digest('base64url')}`;
};

await connect(MONGO);
const tokens = [];
for (let i = 0; i < N; i++) {
  const username = `load_${i}`;
  const u = await UserModel.findOneAndUpdate({ username }, { $setOnInsert: { username, email: `${username}@load.test`, passwordHash: '!load-user-no-password', role: 'user' } }, { upsert: true, new: true }).lean();
  tokens.push(sign(String(u._id)));
}
await disconnect();
writeFileSync(new URL('./.tokens.json', import.meta.url), JSON.stringify(tokens));
console.log(`${tokens.length} users ready; tokens in load/.tokens.json (4 h)`);
