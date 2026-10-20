import './setup.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Redis } from 'ioredis';
import { connect, disconnect, mongoose, UserModel } from '@oj/db';
import { judgeSubmission, projectVerdict } from '@oj/judge';
import { DockerExecutor } from '@oj/sandbox';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStore } from '@oj/storage';
import { createApp } from '../src/app.js';

const store = new FileStore(mkdtempSync(join(tmpdir(), 'oj-test-store-')));
import { redis } from '../src/redis.js';
import { closeStatusBus } from '../src/services/statusBus.js';

const executor = new DockerExecutor({ imageTag: 'dev' });
const pub = new Redis(process.env['REDIS_URL']!);
const app = createApp({ executor, queue: { add: async () => undefined } as never, store });
// the projector is a separate consumer in v2; the test drives it directly after each judgement
const judge = async (id: string) => {
  const v = await judgeSubmission(id, { executor, workerId: 'test', store, publish: () => undefined });
  const row = (await (await import('@oj/db')).SubmissionModel.findById(id).lean())!;
  const c = (await (await import('@oj/db')).ContestModel.findById(row.contestId).lean())!;
  await projectVerdict(pub, String(row.contestId), String(row.userId), `t:${id}`, { problemId: String(row.problemId), status: row.status as never, submittedAt: row.submittedAt }, c.startAt);
  return v;
};

let setter = ''; let alice = ''; let bob = '';
let pA = ''; let pB = ''; let contestId = '';

const reg = async (u: string) => (await request(app).post('/api/auth/register').send({ username: u, email: `${u}@example.com`, password: 'hunter2hunter2' })).body.accessToken as string;
const mkProblem = async (slug: string) => {
  const r = await request(app).post('/api/problems').set('authorization', `Bearer ${setter}`).send({ slug, title: slug, statement: 'a+b', difficulty: 'easy', isPublic: true });
  await request(app).put(`/api/problems/${r.body.id}/testcases`).set('authorization', `Bearer ${setter}`).send({ testcases: [{ input: '1 2\n', output: '3\n', isSample: true }, { input: '5 5\n', output: '10\n' }] });
  return r.body.id as string;
};
const submit = (tok: string, problemId: string, code: string) =>
  request(app).post('/api/submissions').set('authorization', `Bearer ${tok}`).send({ problemId, language: 'python3', code, contestId });

beforeAll(async () => {
  await connect(process.env['MONGO_URI']!);
  await mongoose.connection.dropDatabase();
  await redis.connect(); await redis.flushdb();
  await reg('setter3'); await UserModel.updateOne({ username: 'setter3' }, { $set: { role: 'setter' } });
  setter = (await request(app).post('/api/auth/login').send({ username: 'setter3', password: 'hunter2hunter2' })).body.accessToken;
  alice = await reg('alice'); bob = await reg('bob');
  pA = await mkProblem('c-a'); pB = await mkProblem('c-b');
});
afterAll(async () => { closeStatusBus(); pub.disconnect(); redis.disconnect(); await disconnect(); });

describe('contests', () => {
  it('a setter creates a running contest', async () => {
    const r = await request(app).post('/api/contests').set('authorization', `Bearer ${setter}`).send({
      title: 'weekly 1', startAt: new Date(Date.now() - 60_000).toISOString(), endAt: new Date(Date.now() + 3600_000).toISOString(),
      problems: [{ problemId: pA }, { problemId: pB, points: 200 }],
    });
    expect(r.status).toBe(201);
    contestId = r.body.id;
  });

  it('rejects endAt before startAt', async () => {
    const r = await request(app).post('/api/contests').set('authorization', `Bearer ${setter}`).send({ title: 'x', startAt: new Date().toISOString(), endAt: new Date(Date.now() - 1).toISOString(), problems: [{ problemId: pA }] });
    expect(r.status).toBe(422);
  });

  it('unregistered users cannot submit to it', async () => {
    const r = await submit(alice, pA, 'print(1)');
    expect(r.status).toBe(403);
  });

  it('register, then the problems are visible with letters', async () => {
    expect((await request(app).post(`/api/contests/${contestId}/register`).set('authorization', `Bearer ${alice}`)).status).toBe(204);
    await request(app).post(`/api/contests/${contestId}/register`).set('authorization', `Bearer ${bob}`);
    const d = await request(app).get(`/api/contests/${contestId}`).set('authorization', `Bearer ${alice}`);
    expect(d.body.contest.registered).toBe(true);
    expect(d.body.problems.map((p: { letter: string }) => p.letter)).toEqual(['A', 'B']);
  });

  it('standings reflect solves and penalties in icpc order', async () => {
    // alice: A wrong then right, B right. bob: A right only.
    const a1 = await submit(alice, pA, 'print(99)'); await judge(a1.body.submissionId);
    const a2 = await submit(alice, pA, 'print(sum(map(int,input().split())))'); await judge(a2.body.submissionId);
    const a3 = await submit(alice, pB, 'print(sum(map(int,input().split())))'); await judge(a3.body.submissionId);
    const b1 = await submit(bob, pA, 'print(sum(map(int,input().split())))'); await judge(b1.body.submissionId);

    const board = (await request(app).get(`/api/contests/${contestId}/leaderboard`).set('authorization', `Bearer ${bob}`)).body;
    expect(board.items.map((r: { username: string }) => r.username)).toEqual(['alice', 'bob']);
    expect(board.items[0].solved).toBe(2);
    expect(board.items[0].problems.A.wrongBefore).toBe(1);
    expect(board.items[0].penalty).toBeGreaterThanOrEqual(20);
    expect(board.items[1].solved).toBe(1);
    expect(board.me).toBe(2);
  });

  it('rebuild from mongo reproduces the same board', async () => {
    const before = (await request(app).get(`/api/contests/${contestId}/leaderboard`).set('authorization', `Bearer ${alice}`)).body.items;
    const r = await request(app).post(`/api/contests/${contestId}/rebuild`).set('authorization', `Bearer ${setter}`);
    expect(r.status).toBe(200);
    expect(r.body.replayed).toBe(4);
    const after = (await request(app).get(`/api/contests/${contestId}/leaderboard`).set('authorization', `Bearer ${alice}`)).body.items;
    expect(after).toEqual(before);
  });

  it('a problem outside the contest is rejected', async () => {
    const other = await mkProblem('c-z');
    expect((await submit(alice, other, 'print(1)')).status).toBe(422);
  });
});
