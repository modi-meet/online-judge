#!/usr/bin/env node
// zero-dependency burst: the /submit latency budget (< 200 ms, it only
// enqueues) and verdict latency measured from a laptop. k6 is the real
// contest profile; this is the one you can run without installing anything.
//   node load/burst.mjs [--base http://localhost:4000] [--users 20] [--subs 100] [--conc 20]
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', 'http://localhost:4000');
const USERS = Number(arg('users', 20)); const SUBS = Number(arg('subs', 100)); const CONC = Number(arg('conc', 20));
const CODE = 'a, b = map(int, input().split())\nprint(a + b)\n';

const j = (r) => r.json();
const post = (p, body, tok) => fetch(`${BASE}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify(body) });
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0; };

const problems = await j(await fetch(`${BASE}/api/problems?limit=50`));
const problem = problems.items.find((p) => p.slug === 'sum-of-two') ?? problems.items[0];
if (!problem) { console.error('no problems; seed first'); process.exit(1); }

// the token pool from seed-users.mjs; falls back to registering, which the
// login bucket limits to five a minute per ip
let tokens = [];
try { tokens = JSON.parse((await import('node:fs')).readFileSync(new URL('./.tokens.json', import.meta.url), 'utf8')).slice(0, USERS); } catch { /* no pool */ }
if (tokens.length < USERS) {
  const run = Date.now().toString(36);
  for (let i = tokens.length; i < USERS; i++) {
    const r = await post('/api/auth/register', { username: `burst_${run}_${i}`, email: `burst_${run}_${i}@load.test`, password: 'load-test-pass-1' });
    if (r.status === 429) { console.error(`register rate-limited after ${i} users; run "node load/seed-users.mjs --users ${USERS}" first`); process.exit(1); }
    if (r.status !== 201) { console.error('register failed', r.status, await r.text()); process.exit(1); }
    tokens.push((await j(r)).accessToken);
  }
}

const submitMs = []; const verdictMs = []; const statuses = {}; let failed = 0;
let next = 0;
async function worker() {
  while (next < SUBS) {
    const i = next++;
    const tok = tokens[i % USERS];
    const t0 = performance.now();
    const r = await post('/api/submissions', { problemId: problem.id, language: 'python3', code: CODE }, tok);
    submitMs.push(performance.now() - t0);
    if (r.status !== 202) { failed++; statuses[r.status] = (statuses[r.status] ?? 0) + 1; continue; }
    const { submissionId: id } = await j(r);
    const started = Date.now();
    for (;;) {
      await new Promise((res) => setTimeout(res, 300));
      const pr = await fetch(`${BASE}/api/submissions/${id}`, { headers: { authorization: `Bearer ${tok}` } });
      if (!pr.ok) { statuses[`poll_${pr.status}`] = (statuses[`poll_${pr.status}`] ?? 0) + 1; if (!statuses.firstPollError) statuses.firstPollError = await pr.text(); }
      else {
        const s = (await j(pr)).submission;
        if (s.judgedAt) { verdictMs.push(Date.now() - started); statuses[s.status] = (statuses[s.status] ?? 0) + 1; break; }
      }
      if (Date.now() - started > 120_000) { failed++; statuses.timeout = (statuses.timeout ?? 0) + 1; break; }
    }
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: CONC }, worker));
const wall = (Date.now() - t0) / 1000;

const result = {
  at: new Date().toISOString(), base: BASE, users: USERS, submissions: SUBS, concurrency: CONC, wallSec: Number(wall.toFixed(1)),
  submit: { p50: Math.round(pct(submitMs, 50)), p95: Math.round(pct(submitMs, 95)), p99: Math.round(pct(submitMs, 99)), max: Math.round(Math.max(...submitMs)) },
  verdict: { p50: pct(verdictMs, 50), p95: pct(verdictMs, 95), p99: pct(verdictMs, 99), max: Math.max(...verdictMs, 0) },
  throughputPerSec: Number((verdictMs.length / wall).toFixed(2)), failed, statuses,
};
console.log(JSON.stringify(result, null, 2));
console.log(`\nsubmit p95 ${result.submit.p95} ms (${result.submit.p95 < 200 ? 'ok' : 'OVER BUDGET'})  verdict p95 ${(result.verdict.p95 / 1000).toFixed(1)} s  dropped ${failed}`);
const { writeFileSync, mkdirSync } = await import('node:fs');
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./results/${result.at.slice(0, 19).replace(/[:T]/g, '-')}.json`, import.meta.url), JSON.stringify(result, null, 2));
