// the hld §14 contest profile, scaled by env so it runs on a laptop too.
//   k6 run -e BASE=http://localhost:4000 -e VUS=2000 -e SUBS=8 load/k6/contest.js
// each vu registers once, then submits SUBS times; 30% of the vus start in
// the last ten minutes of the window (the "everyone submits at once" minute).
// pass = /submit p95 < 200 ms, verdict p95 < 30 s, zero dropped submissions.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// pre-minted tokens: see seed-users.mjs. the login bucket is per ip, so a
// generator that registers 2,000 users from one address would be throttled.
const TOKENS = new SharedArray('tokens', () => JSON.parse(open('../.tokens.json')));

const BASE = __ENV.BASE || 'http://localhost:4000';
const VUS = Number(__ENV.VUS || 50);
const SUBS = Number(__ENV.SUBS || 8);
const WINDOW_MIN = Number(__ENV.WINDOW_MIN || 5);
const PROBLEM = __ENV.PROBLEM || 'sum-of-two';

const submitLatency = new Trend('submit_latency', true);
const verdictLatency = new Trend('verdict_latency', true);
const dropped = new Counter('dropped_submissions');

export const options = {
  scenarios: {
    steady: { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: `${WINDOW_MIN * 0.9}m`, target: Math.round(VUS * 0.7) }, { duration: `${WINDOW_MIN * 0.1}m`, target: 0 }] },
    last_minutes: { executor: 'ramping-vus', startTime: `${WINDOW_MIN * 0.9}m`, startVUs: 0, stages: [{ duration: '30s', target: Math.round(VUS * 0.3) }, { duration: `${WINDOW_MIN * 0.1}m`, target: 0 }] },
  },
  thresholds: {
    submit_latency: ['p(95)<200'],
    verdict_latency: ['p(95)<30000'],
    dropped_submissions: ['count==0'],
    http_req_failed: ['rate<0.01'],
  },
};

const CODE = 'a, b = map(int, input().split())\nprint(a + b)\n';

export function setup() {
  const r = http.get(`${BASE}/api/problems?limit=50`);
  const p = r.json('items').find((x) => x.slug === PROBLEM);
  if (!p) throw new Error(`problem ${PROBLEM} not found; seed first`);
  return { problemId: p.id };
}

export default function (data) {
  const auth = { headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKENS[(__VU - 1) % TOKENS.length]}` } };
  for (let i = 0; i < SUBS; i++) {
    const t0 = Date.now();
    const r = http.post(`${BASE}/api/submissions`, JSON.stringify({ problemId: data.problemId, language: 'python3', code: CODE }), auth);
    submitLatency.add(Date.now() - t0);
    if (!check(r, { 'submit 202': (x) => x.status === 202 })) { dropped.add(1); sleep(1); continue; }
    const id = r.json('submissionId');
    // poll until terminal; the browser uses sse, a load generator polls
    let done = false;
    for (let j = 0; j < 60 && !done; j++) {
      sleep(0.5);
      const s = http.get(`${BASE}/api/submissions/${id}`, auth).json('submission');
      if (s && s.judgedAt) { done = true; verdictLatency.add(Date.now() - t0); }
    }
    if (!done) dropped.add(1);
    sleep(Math.random() * 20 + 5); // a human thinks between submissions
  }
}
