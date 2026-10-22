import './setup.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connect, disconnect, mongoose, ContestModel, SubmissionModel, UserModel } from '@oj/db';
import { DockerExecutor } from '@oj/sandbox';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStore } from '@oj/storage';
import { createApp } from '../src/app.js';
import { redis } from '../src/redis.js';

// the ways a user, a client bug or a hostile caller can get the api wrong.
// every one must come back as a proper envelope with the right status —
// never a 500, never a stack trace, never a hidden test case.

const store = new FileStore(mkdtempSync(join(tmpdir(), 'oj-edge-store-')));
const added: unknown[] = [];
const app = createApp({ executor: new DockerExecutor({ imageTag: 'dev' }), queue: { add: async (...a: unknown[]) => { added.push(a); } } as never, store });
const api = () => request(app);
const PY = 'a, b = map(int, input().split())\nprint(a + b)\n';

let setter = ''; let alice = ''; let bob = '';
let publicId = ''; let hiddenId = '';

const reg = async (u: string) => { const r = await api().post('/api/auth/register').send({ username: u, email: `${u}@example.com`, password: 'hunter2hunter2' }); if (r.status !== 201) throw new Error(`register ${u}: ${r.status} ${r.text}`); return r.body.accessToken as string; };
const auth = (t: string) => ({ authorization: `Bearer ${t}` });
const mkProblem = async (slug: string, isPublic: boolean) => {
  const r = await api().post('/api/problems').set(auth(setter)).send({ slug, title: slug, statement: 'a+b', difficulty: 'easy', isPublic });
  await api().put(`/api/problems/${r.body.id}/testcases`).set(auth(setter)).send({ testcases: [{ input: '1 2\n', output: '3\n', isSample: true }, { input: '2 2\n', output: '4\n' }] });
  return r.body.id as string;
};

beforeAll(async () => {
  await connect(process.env['MONGO_URI']!);
  await mongoose.connection.dropDatabase();
  await redis.connect(); await redis.flushdb();
  await reg('edgesetter'); await UserModel.updateOne({ username: 'edgesetter' }, { $set: { role: 'setter' } });
  setter = (await api().post('/api/auth/login').send({ username: 'edgesetter', password: 'hunter2hunter2' })).body.accessToken;
  alice = await reg('edgealice'); bob = await reg('edgebob');
  publicId = await mkProblem('edge-public', true); hiddenId = await mkProblem('edge-hidden', false);
  await redis.flushdb(); // the login bucket is tiny on purpose; do not let setup eat it
});
afterAll(async () => { redis.disconnect(); await disconnect(); });

const envelope = (r: request.Response, status: number, code: string) => {
  expect(r.status).toBe(status);
  expect(r.body.error.code).toBe(code);
  expect(r.body.error.requestId).toBeTypeOf('string');
};

describe('bodies that are not what we asked for', () => {
  it('malformed json is a 400 envelope, not a 500', async () => {
    const r = await api().post('/api/submissions').set(auth(alice)).set('content-type', 'application/json').send('{"problemId": ');
    envelope(r, 400, 'VALIDATION_FAILED');
  });
  it('a body over the json limit is 413', async () => {
    const r = await api().post('/api/submissions').set(auth(alice)).send({ problemId: publicId, language: 'python3', code: 'x'.repeat(200 * 1024) });
    envelope(r, 413, 'VALIDATION_FAILED');
  });
  it('code over 64 kb but under the json limit is 422', async () => {
    const r = await api().post('/api/submissions').set(auth(alice)).send({ problemId: publicId, language: 'python3', code: 'x'.repeat(65 * 1024) });
    envelope(r, 422, 'VALIDATION_FAILED');
  });
  it('empty code, unknown language and a malformed id each name the field', async () => {
    for (const [body, field] of [[{ problemId: publicId, language: 'python3', code: '' }, 'code'], [{ problemId: publicId, language: 'brainfuck', code: PY }, 'language'], [{ problemId: 'nope', language: 'python3', code: PY }, 'problemId']] as const) {
      const r = await api().post('/api/submissions').set(auth(alice)).send(body);
      envelope(r, 422, 'VALIDATION_FAILED');
      expect(JSON.stringify(r.body.error.details)).toContain(field);
    }
  });
  it('an array where an object is expected is 422', async () => {
    envelope(await api().post('/api/submissions').set(auth(alice)).send([1, 2, 3]), 422, 'VALIDATION_FAILED');
  });
  it('unknown routes are a 404 envelope', async () => {
    envelope(await api().get('/api/nothing-here'), 404, 'NOT_FOUND');
  });
});

describe('auth mistakes', () => {
  it('uppercase or short usernames, bad emails and short passwords are rejected', async () => {
    for (const body of [{ username: 'Alice', email: 'a@b.co', password: 'hunter2hunter2' }, { username: 'ab', email: 'a@b.co', password: 'hunter2hunter2' }, { username: 'carol', email: 'not-an-email', password: 'hunter2hunter2' }, { username: 'carol', email: 'c@b.co', password: 'short' }]) {
      envelope(await api().post('/api/auth/register').send(body), 422, 'VALIDATION_FAILED');
    }
  });
  it('a duplicate email is a conflict even with a new username', async () => {
    envelope(await api().post('/api/auth/register').send({ username: 'alice2', email: 'edgealice@example.com', password: 'hunter2hunter2' }), 409, 'CONFLICT');
  });
  it('unknown user and wrong password are the same 401 (no account enumeration)', async () => {
    await redis.flushdb(); // the five bad registrations above spent this ip's login bucket — which is the bucket working
    const a = await api().post('/api/auth/login').send({ username: 'ghost', password: 'hunter2hunter2' });
    const b = await api().post('/api/auth/login').send({ username: 'edgealice', password: 'wrong-password' });
    expect([a.status, b.status]).toEqual([401, 401]);
    expect(a.body.error.message).toBe(b.body.error.message);
  });
  it('a garbage bearer token is treated as anonymous', async () => {
    envelope(await api().get('/api/auth/me').set('authorization', 'Bearer not.a.jwt'), 401, 'UNAUTHENTICATED');
    envelope(await api().get('/api/auth/me').set('authorization', 'Basic abc'), 401, 'UNAUTHENTICATED');
  });
  it('refresh without a cookie is 401', async () => {
    envelope(await api().post('/api/auth/refresh'), 401, 'UNAUTHENTICATED');
  });
  it('a plain user cannot touch setter routes', async () => {
    envelope(await api().post('/api/problems').set(auth(alice)).send({ slug: 'x', title: 'x', statement: 'x', difficulty: 'easy' }), 403, 'FORBIDDEN');
    envelope(await api().post('/api/contests').set(auth(alice)).send({}), 403, 'FORBIDDEN');
  });
});

describe('problems', () => {
  it('unknown slug is 404; a hidden problem is 404 for users and visible to setters', async () => {
    envelope(await api().get('/api/problems/does-not-exist'), 404, 'NOT_FOUND');
    envelope(await api().get('/api/problems/edge-hidden').set(auth(alice)), 404, 'NOT_FOUND');
    expect((await api().get('/api/problems/edge-hidden').set(auth(setter))).status).toBe(200);
  });
  it('list limits are bounded', async () => {
    envelope(await api().get('/api/problems?limit=0'), 422, 'VALIDATION_FAILED');
    envelope(await api().get('/api/problems?limit=1000'), 422, 'VALIDATION_FAILED');
    expect((await api().get('/api/problems?limit=1')).body.items).toHaveLength(1);
  });
  it('a duplicate slug is a conflict; a bad slug, difficulty or limit is 422', async () => {
    envelope(await api().post('/api/problems').set(auth(setter)).send({ slug: 'edge-public', title: 'dup', statement: 'x', difficulty: 'easy' }), 409, 'CONFLICT');
    envelope(await api().post('/api/problems').set(auth(setter)).send({ slug: 'Bad Slug', title: 'x', statement: 'x', difficulty: 'easy' }), 422, 'VALIDATION_FAILED');
    envelope(await api().post('/api/problems').set(auth(setter)).send({ slug: 'ok', title: 'x', statement: 'x', difficulty: 'impossible' }), 422, 'VALIDATION_FAILED');
    envelope(await api().post('/api/problems').set(auth(setter)).send({ slug: 'ok', title: 'x', statement: 'x', difficulty: 'easy', timeLimitMs: 60_000 }), 422, 'VALIDATION_FAILED');
  });
  it('a statement with html is stored and returned verbatim (the web renders text, not html)', async () => {
    const xss = '<script>alert(1)</script> & "quotes"';
    const r = await api().post('/api/problems').set(auth(setter)).send({ slug: 'edge-xss', title: 'xss', statement: xss, difficulty: 'easy', isPublic: true });
    expect(r.status).toBe(201);
    expect((await api().get('/api/problems/edge-xss')).body.problem.statement).toBe(xss);
  });
  it('test cases for an unknown problem are 404', async () => {
    envelope(await api().put('/api/problems/ffffffffffffffffffffffff/testcases').set(auth(setter)).send({ testcases: [{ input: '1', output: '1' }] }), 404, 'NOT_FOUND');
  });
});

describe('submitting wrong', () => {
  it('unknown and hidden problems are 404 for a user', async () => {
    envelope(await api().post('/api/submissions').set(auth(alice)).send({ problemId: 'ffffffffffffffffffffffff', language: 'python3', code: PY }), 404, 'NOT_FOUND');
    envelope(await api().post('/api/submissions').set(auth(alice)).send({ problemId: hiddenId, language: 'python3', code: PY }), 404, 'NOT_FOUND');
  });
  it('without sign in it is 401', async () => {
    envelope(await api().post('/api/submissions').send({ problemId: publicId, language: 'python3', code: PY }), 401, 'UNAUTHENTICATED');
  });
  it('contest mistakes: unknown, ended, not registered, problem not in contest', async () => {
    const ended = await ContestModel.create({ title: 'over', startAt: new Date(Date.now() - 7200_000), endAt: new Date(Date.now() - 3600_000), problems: [{ problemId: publicId }], participants: [] });
    const live = await ContestModel.create({ title: 'live', startAt: new Date(Date.now() - 60_000), endAt: new Date(Date.now() + 3600_000), problems: [{ problemId: hiddenId }], participants: [] });
    const body = { problemId: publicId, language: 'python3', code: PY };
    envelope(await api().post('/api/submissions').set(auth(alice)).send({ ...body, contestId: 'ffffffffffffffffffffffff' }), 409, 'CONTEST_NOT_RUNNING');
    envelope(await api().post('/api/submissions').set(auth(alice)).send({ ...body, contestId: String(ended._id) }), 409, 'CONTEST_NOT_RUNNING');
    envelope(await api().post('/api/submissions').set(auth(alice)).send({ ...body, contestId: String(live._id) }), 403, 'FORBIDDEN');
    expect((await api().post(`/api/contests/${String(live._id)}/register`).set(auth(alice))).status).toBeLessThan(300);
    envelope(await api().post('/api/submissions').set(auth(alice)).send({ ...body, contestId: String(live._id) }), 422, 'VALIDATION_FAILED');
    envelope(await api().post(`/api/contests/${String(ended._id)}/register`).set(auth(alice)), 409, 'CONTEST_NOT_RUNNING');
  });
  it('registering twice is harmless', async () => {
    const c = await ContestModel.create({ title: 'twice', startAt: new Date(Date.now() - 60_000), endAt: new Date(Date.now() + 3600_000), problems: [{ problemId: publicId }], participants: [] });
    const a = await api().post(`/api/contests/${String(c._id)}/register`).set(auth(bob));
    const b = await api().post(`/api/contests/${String(c._id)}/register`).set(auth(bob));
    expect(a.status).toBeLessThan(300); expect(b.status).toBeLessThan(300);
    expect((await ContestModel.findById(c._id).lean())!.participants).toHaveLength(1);
  });
  it('the same idempotency key twice returns the same submission, once', async () => {
    const h = { ...auth(alice), 'idempotency-key': 'edge-key-1' };
    const a = await api().post('/api/submissions').set(h).send({ problemId: publicId, language: 'python3', code: PY });
    const b = await api().post('/api/submissions').set(h).send({ problemId: publicId, language: 'python3', code: PY });
    expect(a.status).toBe(202); expect(b.status).toBe(200);
    expect(b.body).toMatchObject({ submissionId: a.body.submissionId, deduplicated: true });
    expect(await SubmissionModel.countDocuments({ userId: (await UserModel.findOne({ username: 'edgealice' }))!._id })).toBe(1);
  });
  it('another user cannot read your submission; a setter can', async () => {
    const id = (await SubmissionModel.findOne().lean())!._id;
    envelope(await api().get(`/api/submissions/${String(id)}`).set(auth(bob)), 403, 'FORBIDDEN');
    expect((await api().get(`/api/submissions/${String(id)}`).set(auth(setter))).status).toBe(200);
    envelope(await api().get('/api/submissions/ffffffffffffffffffffffff').set(auth(alice)), 404, 'NOT_FOUND');
    envelope(await api().get('/api/submissions/not-an-id').set(auth(alice)), 422, 'VALIDATION_FAILED');
  });
  it('the submit bucket closes at 20 in a burst and says when to come back', async () => {
    await redis.flushdb();
    let last: request.Response | null = null;
    for (let i = 0; i < 21; i++) last = await api().post('/api/submissions').set(auth(bob)).send({ problemId: publicId, language: 'python3', code: PY });
    envelope(last!, 429, 'RATE_LIMITED');
    expect(last!.headers['retry-after']).toBeDefined();
    expect(last!.body.error.details.retryAfterSec).toBeGreaterThan(0);
    await redis.flushdb();
  });
});

describe('rejudge', () => {
  it('a setter re-queues a judged row; a user cannot; a pending row is a conflict', async () => {
    const s = await SubmissionModel.create({ userId: (await UserModel.findOne({ username: 'edgealice' }))!._id, problemId: publicId, language: 'python3', codeRef: `inline:${PY}`, status: 'WA', failedTestcaseIdx: 1, passedCount: 1, totalCount: 2, timeMs: 12, attempts: 1, judgedBy: 'w1', judgedAt: new Date() });
    envelope(await api().post(`/api/submissions/${String(s._id)}/rejudge`).set(auth(alice)), 403, 'FORBIDDEN');
    const before = added.length;
    const r = await api().post(`/api/submissions/${String(s._id)}/rejudge`).set(auth(setter));
    expect(r.status).toBe(202);
    expect(added.length).toBe(before + 1);
    const row = (await SubmissionModel.findById(s._id).lean())!;
    expect(row).toMatchObject({ status: 'QUEUED', failedTestcaseIdx: null, passedCount: 0, attempts: 0, judgedBy: null, judgedAt: null });
    envelope(await api().post(`/api/submissions/${String(s._id)}/rejudge`).set(auth(setter)), 409, 'CONFLICT');
    envelope(await api().post('/api/submissions/ffffffffffffffffffffffff/rejudge').set(auth(setter)), 404, 'NOT_FOUND');
  });
});

describe('/run with awkward programs', () => {
  it('stdin over 64 kb is 422; unicode in and out works; crlf code runs', async () => {
    envelope(await api().post('/api/run').set(auth(alice)).send({ language: 'python3', code: 'print(1)', stdin: 'x'.repeat(65 * 1024) }), 422, 'VALIDATION_FAILED');
    const u = await api().post('/api/run').set(auth(alice)).send({ language: 'python3', code: 'print(input()[::-1])', stdin: 'héllo wörld\n' });
    expect(u.status).toBe(200); expect(u.body.stdout.trim()).toBe('dlröw olléh');
    const crlf = await api().post('/api/run').set(auth(alice)).send({ language: 'python3', code: 'a = 1\r\nprint(a + 1)\r\n', stdin: '' });
    expect(crlf.body.stdout.trim()).toBe('2');
  });
  it('a program that floods stdout is cut off and flagged, not allowed to fill the disk', async () => {
    const r = await api().post('/api/run').set(auth(alice)).send({ language: 'python3', code: 'while True:\n    print("x" * 1000)\n', stdin: '' });
    expect(r.status).toBe(200);
    expect(r.body.stdoutTruncated).toBe(true);
    expect(r.body.stdout.length).toBeLessThanOrEqual(64 * 1024 + 1024);
  });
  it('a program that never terminates times out with a flag', async () => {
    const r = await api().post('/api/run').set(auth(alice)).send({ language: 'python3', code: 'while True: pass\n', stdin: '' });
    expect(r.status).toBe(200);
    expect(r.body.timedOut).toBe(true);
  }, 30_000);
  it('a program that reads more input than given gets eof, not a hang', async () => {
    const r = await api().post('/api/run').set(auth(alice)).send({ language: 'python3', code: 'import sys\nprint(len(sys.stdin.read()))\ntry:\n    input()\nexcept EOFError:\n    print("eof")\n', stdin: '' });
    expect(r.body.stdout.trim().split('\n')).toEqual(['0', 'eof']);
  });
});

describe('profile', () => {
  const PX = 'data:image/png;base64,iVBORw0KGgo=';
  it('the owner can update their details and sees their email', async () => {
    const r = await api().patch('/api/users/me').set(auth(alice)).send({ displayName: 'Alice A', bio: 'hello', location: 'Pune', avatar: PX });
    expect(r.status).toBe(200);
    const g = await api().get('/api/users/edgealice').set(auth(alice));
    expect(g.body.user.displayName).toBe('Alice A');
    expect(g.body.user.avatar).toBe(PX);
    expect(g.body.user.email).toBe('edgealice@example.com');
  });
  it('email stays private from other users and from anonymous callers', async () => {
    expect((await api().get('/api/users/edgealice').set(auth(bob))).body.user.email).toBeUndefined();
    expect((await api().get('/api/users/edgealice')).body.user.email).toBeUndefined();
  });
  it('rejects an avatar that is not an image data url', async () => {
    envelope(await api().patch('/api/users/me').set(auth(alice)).send({ avatar: 'https://evil.example/x.png' }), 422, 'VALIDATION_FAILED');
    envelope(await api().patch('/api/users/me').set(auth(alice)).send({ avatar: 'data:text/html;base64,PHNjcmlwdD4=' }), 422, 'VALIDATION_FAILED');
  });
  it('rejects an over-long bio and an anonymous update', async () => {
    envelope(await api().patch('/api/users/me').set(auth(alice)).send({ bio: 'x'.repeat(281) }), 422, 'VALIDATION_FAILED');
    envelope(await api().patch('/api/users/me').send({ bio: 'hi' }), 401, 'UNAUTHENTICATED');
  });
  it('cannot change role, email or rating through the profile endpoint', async () => {
    await api().patch('/api/users/me').set(auth(bob)).send({ role: 'admin', rating: 9999, email: 'x@y.z' });
    const u = await UserModel.findOne({ username: 'edgebob' }).lean();
    expect(u!.role).toBe('user'); expect(u!.rating).toBe(0); expect(u!.email).toBe('edgebob@example.com');
  });
});
