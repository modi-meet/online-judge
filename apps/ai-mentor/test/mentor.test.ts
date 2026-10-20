import './setup.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import { connect, disconnect, mongoose, ContestModel, ProblemModel, TestcaseModel, UserModel } from '@oj/db';
import { DockerExecutor } from '@oj/sandbox';
import type { Mode } from '@oj/mentor';
import { createApp } from '../src/app.js';
import { Budget, ReplyCache } from '../src/budget.js';
import { loadProblem } from '../src/context.js';
import { FakeProvider } from '../src/provider.js';

const redis = new Redis(process.env['REDIS_URL']!);
let reply: ((mode: Mode, user: string) => string) | undefined;
const provider = new FakeProvider((m, u) => (reply ? reply(m, u) : `canned ${m.key}: ${/problem: (.*)/.exec(u)?.[1]}`));
const app = createApp({ provider, executor: new DockerExecutor({ imageTag: 'dev' }), budget: new Budget(redis), cache: new ReplyCache(redis) });

const tok = (sub: string) => jwt.sign({ sub, role: 'user', jti: sub }, process.env['JWT_SECRET']!, { algorithm: 'HS256', expiresIn: 600 });
let alice = ''; let bob = ''; let problemId = ''; let noSample = '';

interface Ev { type: string; [k: string]: unknown }
const parse = (body: string): Ev[] => body.split('\n\n').filter((f) => f.includes('data:')).map((f) => JSON.parse(/^data: (.*)$/m.exec(f)![1]!) as Ev);
const ask = (t: string, body: Record<string, unknown>) => request(app).post('/api/ai/mentor').set('authorization', `Bearer ${t}`).send(body);

beforeAll(async () => {
  await connect(process.env['MONGO_URI']!);
  await mongoose.connection.dropDatabase();
  await redis.flushdb();
  const u1 = await UserModel.create({ username: 'alice', email: 'a@x.io', passwordHash: 'x', role: 'user' });
  const u2 = await UserModel.create({ username: 'bob', email: 'b@x.io', passwordHash: 'x', role: 'user' });
  alice = tok(String(u1._id)); bob = tok(String(u2._id));
  const p = await ProblemModel.create({ slug: 'sum', title: 'array sum', statement: 'print the sum of n integers.\nconstraints: 1 <= n <= 10^5', difficulty: 'easy', tags: ['arrays'], isPublic: true, createdBy: u1._id, timeLimitMs: 1000 });
  problemId = String(p._id);
  await TestcaseModel.create([
    { problemId: p._id, idx: 0, isSample: true, inputRef: 'inline:3\n1 2 3\n', outputRef: 'inline:6\n' },
    { problemId: p._id, idx: 1, isSample: false, inputRef: 'file:hidden/1.in', outputRef: 'file:hidden/1.out' },
    { problemId: p._id, idx: 2, isSample: false, inputRef: 'inline:5\n1 1 1 1 1\n', outputRef: 'inline:5\n' },
  ]);
  const p2 = await ProblemModel.create({ slug: 'nosample', title: 'no sample', statement: 'x', difficulty: 'easy', isPublic: true, createdBy: u1._id });
  noSample = String(p2._id);
});
afterAll(async () => { redis.disconnect(); await disconnect(); });

describe('context', () => {
  it('only sample cases reach the prompt, hidden ones never do', async () => {
    const c = await loadProblem(problemId);
    expect(c.samples).toHaveLength(1);
    expect(c.samples[0]!.input).toBe('3\n1 2 3\n');
    expect(c.constraints).toContain('1 <= n <= 10^5');
  });
});

describe('POST /api/ai/mentor', () => {
  it('requires a signed-in user', async () => {
    const r = await request(app).post('/api/ai/mentor').send({ problemId, mode: 1, language: 'python3' });
    expect(r.status).toBe(401);
  });
  it('streams a mode 1 answer as server-sent events', async () => {
    const r = await ask(alice, { problemId, mode: 1, language: 'python3', code: '' });
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toContain('text/event-stream');
    const ev = parse(r.text);
    expect(ev[0]).toMatchObject({ type: 'meta', cached: false });
    expect(ev.filter((e) => e.type === 'token').map((e) => e['text']).join('')).toBe('canned intuition: array sum');
    expect(ev.at(-1)!.type).toBe('done');
  });
  it('the same question again comes from the cache', async () => {
    const r = await ask(alice, { problemId, mode: 1, language: 'python3', code: '' });
    expect(parse(r.text)[0]).toMatchObject({ type: 'meta', cached: true });
  });
  it('the leak guard replaces a reply that contains a full solution', async () => {
    reply = () => 'sure, here:\n```python\nimport sys\ndef main():\n    d = sys.stdin.read().split()\n    n = int(d[0])\n    a = list(map(int, d[1:]))\n    s = 0\n    for x in a:\n        s += x\n    print(s)\nmain()\n```\n';
    const r = await ask(alice, { problemId, mode: 2, language: 'python3', code: 'print(1)' });
    reply = undefined;
    const ev = parse(r.text);
    const blocked = ev.find((e) => e.type === 'blocked');
    expect(blocked).toMatchObject({ rule: 'A' });
    expect(ev.filter((e) => e.type === 'token').map((e) => e['text']).join('')).toBe('sure, here:\n');
  });
  it('mode 3 runs the code on sample 1 and hands the model a real trace', async () => {
    reply = (_m, u) => u; // echo the prompt so the test can see what the model would see
    const r = await ask(bob, { problemId, mode: 3, language: 'python3', code: 'n = int(input())\na = list(map(int, input().split()))\ns = 0\nfor x in a:\n    s += x\nprint(s)\n' });
    reply = undefined;
    const ev = parse(r.text);
    expect(ev.some((e) => e.type === 'status')).toBe(true);
    const prompt = ev.filter((e) => e.type === 'token').map((e) => e['text']).join('');
    expect(prompt).toContain('--- trace ---');
    expect(prompt).toMatch(/L\d+ <module>: n=3/);
    expect(prompt).toContain('verdict on this sample: matches');
    expect(prompt).not.toContain('1 1 1 1 1');
  });
  it('mode 4 measures runtimes at scaled sizes and reports the fit', async () => {
    reply = (_m, u) => u;
    const r = await ask(bob, { problemId, mode: 4, language: 'python3', code: 'n = int(input())\na = list(map(int, input().split()))\nprint(sum(a))\n' });
    reply = undefined;
    const prompt = parse(r.text).filter((e) => e.type === 'token').map((e) => e['text']).join('');
    expect(prompt).toContain('--- timing ---');
    expect(prompt).toMatch(/n= +100000 +\d+ ms/);
    expect(prompt).toMatch(/fit: /);
  });
  it('mode 3 refuses a problem with no sample', async () => {
    const r = await ask(bob, { problemId: noSample, mode: 3, language: 'python3', code: 'print(1)' });
    expect(r.status).toBe(422);
  });
  it('is blocked inside a running contest that has the mentor off', async () => {
    const c = await ContestModel.create({ title: 'closed', startAt: new Date(Date.now() - 1000), endAt: new Date(Date.now() + 3600_000), problems: [{ problemId }], aiMentorEnabled: false });
    const r = await ask(alice, { problemId, mode: 5, language: 'cpp17', code: '', contestId: String(c._id) });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('AI_DISABLED_IN_CONTEST');
    await ContestModel.updateOne({ _id: c._id }, { $set: { aiMentorEnabled: true } });
    expect((await ask(alice, { problemId, mode: 5, language: 'cpp17', code: '', contestId: String(c._id) })).status).toBe(200);
  });
  it('stops a user who has spent their daily share', async () => {
    reply = () => 'x'.repeat(1700); // ~425 tokens; the per-user share is 400
    const u = await UserModel.create({ username: 'carol', email: 'c@x.io', passwordHash: 'x', role: 'user' });
    const carol = tok(String(u._id));
    expect((await ask(carol, { problemId, mode: 6, language: 'cpp17', code: '' })).status).toBe(200);
    const r = await ask(carol, { problemId, mode: 2, language: 'cpp17', code: 'int x;' });
    reply = undefined;
    expect(r.status).toBe(429);
    expect(r.body.error.code).toBe('AI_BUDGET_EXCEEDED');
  });
});
