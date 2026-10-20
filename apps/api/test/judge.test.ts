import './setup.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Redis } from 'ioredis';
import { connect, disconnect, mongoose, OutboxModel, SubmissionModel, UserModel } from '@oj/db';
import { judgeSubmission } from '@oj/judge';
import { DockerExecutor } from '@oj/sandbox';
import { createApp } from '../src/app.js';
import { redis } from '../src/redis.js';
import { closeStatusBus } from '../src/services/statusBus.js';

// end to end: the api enqueues, the judge core (as the worker would run it)
// produces a verdict, the api streams it. needs docker + runner images.
const executor = new DockerExecutor({ imageTag: 'dev' });
const pub = new Redis(process.env['REDIS_URL']!);
const jobs: string[] = [];
const app = createApp({ executor, queue: { add: async (_n: string, d: { submissionId: string }) => { jobs.push(d.submissionId); } } as never });
const judge = (id: string) => judgeSubmission(id, { executor, workerId: 'test', publish: (sid, ev) => pub.publish(`sub:${sid}`, JSON.stringify(ev)).then(() => undefined) });

let setter = '';
let user = '';
let problemId = '';

beforeAll(async () => {
  await connect(process.env['MONGO_URI']!);
  await mongoose.connection.dropDatabase();
  await redis.connect();
  await redis.flushdb();
  await request(app).post('/api/auth/register').send({ username: 'setter2', email: 's2@example.com', password: 'hunter2hunter2' });
  await UserModel.updateOne({ username: 'setter2' }, { $set: { role: 'setter' } });
  setter = (await request(app).post('/api/auth/login').send({ username: 'setter2', password: 'hunter2hunter2' })).body.accessToken;
  user = (await request(app).post('/api/auth/register').send({ username: 'solver', email: 'sv@example.com', password: 'hunter2hunter2' })).body.accessToken;
  const p = await request(app).post('/api/problems').set('authorization', `Bearer ${setter}`).send({
    slug: 'add', title: 'add', statement: 'a+b', difficulty: 'easy', isPublic: true, timeLimitMs: 1000, memoryLimitMb: 128,
  });
  problemId = p.body.id;
  await request(app).put(`/api/problems/${problemId}/testcases`).set('authorization', `Bearer ${setter}`).send({
    testcases: [{ input: '1 2\n', output: '3\n', isSample: true }, { input: '10 20\n', output: '30\n' }, { input: '-1 1\n', output: '0\n' }],
  });
});
afterAll(async () => { closeStatusBus(); pub.disconnect(); redis.disconnect(); await disconnect(); });

const submit = async (code: string, language = 'python3', headers: Record<string, string> = {}) =>
  request(app).post('/api/submissions').set('authorization', `Bearer ${user}`).set(headers).send({ problemId, language, code });

describe('submit path', () => {
  it('returns 202 immediately with a queued row and a job', async () => {
    const r = await submit('print(sum(map(int, input().split())))');
    expect(r.status).toBe(202);
    expect(r.body.status).toBe('QUEUED');
    expect(jobs).toContain(r.body.submissionId);
    expect((await SubmissionModel.findById(r.body.submissionId).lean())?.status).toBe('QUEUED');
    expect(await OutboxModel.countDocuments({ aggregateId: r.body.submissionId, topic: 'submission.created' })).toBe(1);
  });

  it('idempotency key deduplicates a double submit', async () => {
    const a = await submit('print(1)', 'python3', { 'idempotency-key': 'k1' });
    const b = await submit('print(1)', 'python3', { 'idempotency-key': 'k1' });
    expect(b.status).toBe(200);
    expect(b.body.submissionId).toBe(a.body.submissionId);
    expect(b.body.deduplicated).toBe(true);
  });

  it("a user cannot read someone else's submission", async () => {
    const r = await submit('print(1)');
    const other = (await request(app).post('/api/auth/register').send({ username: 'nosy', email: 'n@example.com', password: 'hunter2hunter2' })).body.accessToken;
    expect((await request(app).get(`/api/submissions/${r.body.submissionId}`).set('authorization', `Bearer ${other}`)).status).toBe(403);
  });
});

describe('judging', () => {
  it('a correct solution is AC with timing and the outbox event', async () => {
    const { body } = await submit('print(sum(map(int, input().split())))');
    expect(await judge(body.submissionId)).toBe('AC');
    const row = await SubmissionModel.findById(body.submissionId).lean();
    expect(row?.passedCount).toBe(3);
    expect(row?.timeMs).toBeGreaterThanOrEqual(0);
    expect(row?.memoryKb).toBeGreaterThan(0);
    expect(await OutboxModel.countDocuments({ aggregateId: body.submissionId, topic: 'submission.judged' })).toBe(1);
    expect((await UserModel.findOne({ username: 'solver' }).lean())?.solvedCount).toBe(1);
  });

  it('a second AC on the same problem does not double count solved', async () => {
    const { body } = await submit('a,b=map(int,input().split());print(a+b)');
    expect(await judge(body.submissionId)).toBe('AC');
    expect((await UserModel.findOne({ username: 'solver' }).lean())?.solvedCount).toBe(1);
  });

  it('a wrong answer names the failing case and stops early', async () => {
    const { body } = await submit('a,b=map(int,input().split());print(a+b if a>0 else 99)');
    expect(await judge(body.submissionId)).toBe('WA');
    const row = await SubmissionModel.findById(body.submissionId).lean();
    expect(row?.failedTestcaseIdx).toBe(2);
    expect(row?.passedCount).toBe(2);
  });

  it('compile error carries the compiler log', async () => {
    const { body } = await submit('int main( {', 'cpp17');
    expect(await judge(body.submissionId)).toBe('CE');
    expect((await SubmissionModel.findById(body.submissionId).lean())?.compilerLog).toMatch(/error/);
  });

  it('an infinite loop is TLE', async () => {
    const { body } = await submit('while True: pass');
    expect(await judge(body.submissionId)).toBe('TLE');
  });

  it('a crash is RE with stderr', async () => {
    const { body } = await submit('raise RuntimeError("boom")');
    expect(await judge(body.submissionId)).toBe('RE');
    expect((await SubmissionModel.findById(body.submissionId).lean())?.stderrTail).toContain('boom');
  });

  it('judging an already finished submission is a no-op', async () => {
    const { body } = await submit('print(3)');
    expect(await judge(body.submissionId)).toBe('WA');
    expect(await judge(body.submissionId)).toBeNull();
  });

  it('the sse stream delivers the transitions and closes on the verdict', async () => {
    const { body } = await submit('print(sum(map(int, input().split())))');
    // supertest sends lazily; wrap so the stream is open before judging starts
    const streamP = (async () => request(app).get(`/api/submissions/${body.submissionId}/stream`).set('authorization', `Bearer ${user}`).buffer(true).parse((res, cb) => {
      let data = ''; res.on('data', (c: Buffer) => { data += c.toString(); }); res.on('end', () => cb(null, data));
    }))();
    await new Promise((r) => setTimeout(r, 300));
    await judge(body.submissionId);
    const res = await streamP;
    const statuses = [...(res.body as string).matchAll(/"status":"(\w+)"/g)].map((m) => m[1]);
    expect(statuses[0]).toBe('QUEUED');
    expect(statuses).toContain('RUNNING');
    expect(statuses[statuses.length - 1]).toBe('AC');
  });
});
