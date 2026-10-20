import './setup.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connect, disconnect, mongoose } from '@oj/db';
import { HostExecutor } from '@oj/sandbox';
import { createApp } from '../src/app.js';
import { redis } from '../src/redis.js';

const app = createApp({ executor: new HostExecutor(), queue: { add: async () => undefined } as never });
const agent = () => request(app);

beforeAll(async () => {
  await connect(process.env['MONGO_URI']!);
  await mongoose.connection.dropDatabase();
  await redis.connect();
  await redis.flushdb();
});
afterAll(async () => {
  await disconnect();
  redis.disconnect();
});

const cookieOf = (res: request.Response) => (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('oj_refresh='))!.split(';')[0]!;

describe('auth', () => {
  let access = '';
  let cookie = '';

  it('registers and returns an access token plus refresh cookie', async () => {
    const r = await agent().post('/api/auth/register').send({ username: 'meet', email: 'meet@example.com', password: 'hunter2hunter2' });
    expect(r.status).toBe(201);
    expect(r.body.accessToken).toBeTypeOf('string');
    expect(r.body.user.username).toBe('meet');
    cookie = cookieOf(r);
    access = r.body.accessToken;
  });

  it('rejects a duplicate username with a conflict envelope', async () => {
    const r = await agent().post('/api/auth/register').send({ username: 'meet', email: 'other@example.com', password: 'hunter2hunter2' });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CONFLICT');
    expect(r.body.error.requestId).toBeTypeOf('string');
  });

  it('validation failures name the field', async () => {
    const r = await agent().post('/api/auth/register').send({ username: 'X!', email: 'nope', password: 'short' });
    expect(r.status).toBe(422);
    const paths = r.body.error.details.fields.map((f: { path: string }) => f.path);
    expect(paths).toEqual(expect.arrayContaining(['username', 'email', 'password']));
  });

  it('serves /me with the access token', async () => {
    const r = await agent().get('/api/auth/me').set('authorization', `Bearer ${access}`);
    expect(r.status).toBe(200);
    expect(r.body.user.username).toBe('meet');
  });

  it('refresh rotates the cookie', async () => {
    const r = await agent().post('/api/auth/refresh').set('cookie', cookie);
    expect(r.status).toBe(200);
    const next = cookieOf(r);
    expect(next).not.toBe(cookie);
    // replaying the old token is reuse: the whole family is revoked
    const replay = await agent().post('/api/auth/refresh').set('cookie', cookie);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('TOKEN_REUSE_DETECTED');
    const victim = await agent().post('/api/auth/refresh').set('cookie', next);
    expect(victim.status).toBe(401);
  });

  it('login with a wrong password is 401', async () => {
    const r = await agent().post('/api/auth/login').send({ username: 'meet', password: 'wrong-wrong' });
    expect(r.status).toBe(401);
  });

  it('rate limits login attempts', async () => {
    const hits = [];
    for (let i = 0; i < 7; i++) hits.push(await agent().post('/api/auth/login').send({ username: 'meet', password: 'wrong-wrong' }));
    expect(hits.some((h) => h.status === 429)).toBe(true);
    expect(hits.find((h) => h.status === 429)!.headers['retry-after']).toBeDefined();
  });
});

describe('problems', () => {
  let setter = '';
  let user = '';
  let problemId = '';

  beforeAll(async () => {
    await redis.flushdb();
    const s = await agent().post('/api/auth/register').send({ username: 'setter', email: 's@example.com', password: 'hunter2hunter2' });
    await mongoose.connection.collection('users').updateOne({ username: 'setter' }, { $set: { role: 'setter' } });
    const login = await agent().post('/api/auth/login').send({ username: 'setter', password: 'hunter2hunter2' });
    setter = login.body.accessToken;
    expect(s.status).toBe(201);
    const u = await agent().post('/api/auth/register').send({ username: 'learner', email: 'l@example.com', password: 'hunter2hunter2' });
    user = u.body.accessToken;
  });

  it('a plain user cannot create problems', async () => {
    const r = await agent().post('/api/problems').set('authorization', `Bearer ${user}`).send({ slug: 'x', title: 'x', statement: 'x', difficulty: 'easy' });
    expect(r.status).toBe(403);
  });

  it('a setter creates a problem and attaches test cases', async () => {
    const r = await agent().post('/api/problems').set('authorization', `Bearer ${setter}`).send({
      slug: 'sum-of-two', title: 'sum of two numbers', statement: 'read a and b, print a+b', difficulty: 'easy', tags: ['math'], isPublic: true,
    });
    expect(r.status).toBe(201);
    problemId = r.body.id;
    const t = await agent().put(`/api/problems/${problemId}/testcases`).set('authorization', `Bearer ${setter}`).send({
      testcases: [
        { input: '1 2\n', output: '3\n', isSample: true },
        { input: '100 200\n', output: '300\n' },
        { input: '-5 5\n', output: '0\n' },
      ],
    });
    expect(t.status).toBe(200);
    expect(t.body.count).toBe(3);
    expect(t.body.testcaseSetVersion).toHaveLength(16);
  });

  it('the problem page returns samples only, never hidden cases', async () => {
    const r = await agent().get('/api/problems/sum-of-two');
    expect(r.status).toBe(200);
    expect(r.body.problem.title).toBe('sum of two numbers');
    expect(r.body.samples).toHaveLength(1);
    expect(r.body.samples[0].input).toBe('1 2\n');
  });

  it('lists with cursor pagination', async () => {
    for (let i = 0; i < 3; i++) {
      await agent().post('/api/problems').set('authorization', `Bearer ${setter}`).send({ slug: `p${i}`, title: `p${i}`, statement: 's', difficulty: 'medium', isPublic: true });
    }
    const a = await agent().get('/api/problems?limit=2');
    expect(a.body.items).toHaveLength(2);
    expect(a.body.nextCursor).toBeTypeOf('string');
    const b = await agent().get(`/api/problems?limit=2&cursor=${a.body.nextCursor}`);
    expect(b.body.items).toHaveLength(2);
    const ids = [...a.body.items, ...b.body.items].map((p: { id: string }) => p.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('hides non-public problems from plain users but not from setters', async () => {
    await agent().post('/api/problems').set('authorization', `Bearer ${setter}`).send({ slug: 'draft', title: 'draft', statement: 's', difficulty: 'hard' });
    expect((await agent().get('/api/problems/draft')).status).toBe(404);
    expect((await agent().get('/api/problems/draft').set('authorization', `Bearer ${setter}`)).status).toBe(200);
  });
});

describe('run', () => {
  let access = '';
  beforeAll(async () => {
    await redis.flushdb();
    const r = await agent().post('/api/auth/register').send({ username: 'runner', email: 'r@example.com', password: 'hunter2hunter2' });
    access = r.body.accessToken;
  });

  it('requires sign in', async () => {
    expect((await agent().post('/api/run').send({ language: 'python3', code: 'print(1)' })).status).toBe(401);
  });

  it('runs python with custom stdin', async () => {
    const r = await agent().post('/api/run').set('authorization', `Bearer ${access}`).send({ language: 'python3', code: 'print(input()[::-1])', stdin: 'abc' });
    expect(r.status).toBe(200);
    expect(r.body.stdout).toBe('cba\n');
    expect(r.body.timedOut).toBe(false);
  });

  it('returns the compile error for broken c++', async () => {
    const r = await agent().post('/api/run').set('authorization', `Bearer ${access}`).send({ language: 'cpp17', code: 'int main() { return x; }' });
    expect(r.status).toBe(200);
    expect(r.body.compileError).toMatch(/error/);
  });

  it('rejects an unknown language', async () => {
    expect((await agent().post('/api/run').set('authorization', `Bearer ${access}`).send({ language: 'brainfuck', code: '+' })).status).toBe(422);
  });
});
