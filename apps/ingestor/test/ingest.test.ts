import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect, disconnect, mongoose, ProblemModel, TestcaseModel, UserModel } from '@oj/db';
import { FileAdapter } from '../src/adapters/file.js';
import { ingest } from '../src/ingest.js';
import type { Adapter, RawProblem } from '../src/adapters/types.js';

process.env['MONGO_URI'] ??= 'mongodb://localhost:27017/oj_ingest_test?directConnection=true';
const bundle = new URL('../data/sample-bundle.json', import.meta.url).pathname;
let setterId: mongoose.Types.ObjectId;

beforeAll(async () => {
  await connect(process.env['MONGO_URI']!);
  await mongoose.connection.dropDatabase();
  const u = await UserModel.create({ username: 'ing', email: 'ing@x.io', passwordHash: 'x', role: 'setter' });
  setterId = u._id;
});
afterAll(async () => { await disconnect(); });

const mem = (site: string, list: RawProblem[]): Adapter => ({ site, async *problems() { yield* list; } });

describe('ingest', () => {
  it('inserts the sample bundle with cases, then is a no-op on re-run', async () => {
    const a = await FileAdapter.open(bundle);
    expect(a.site).toBe('oj-samples');
    const r1 = await ingest(a, { createdBy: setterId, makePublic: true });
    expect(r1).toMatchObject({ inserted: 3, updated: 0, unchanged: 0, failed: [] });
    const p = await ProblemModel.findOne({ slug: 'count-the-vowels' }).lean();
    expect(p?.isPublic).toBe(true);
    expect(p?.source?.site).toBe('oj-samples');
    expect(p?.difficulty).toBe('easy');
    expect(await TestcaseModel.countDocuments({ problemId: p!._id })).toBe(4);
    expect(await TestcaseModel.countDocuments({ problemId: p!._id, isSample: true })).toBe(1);
    const r2 = await ingest(await FileAdapter.open(bundle), { createdBy: setterId, makePublic: true });
    expect(r2).toMatchObject({ inserted: 0, updated: 0, unchanged: 3 });
  });
  it('a changed case set replaces the cases and bumps the version; a title fix does not', async () => {
    const before = (await ProblemModel.findOne({ 'source.externalId': 'brackets' }).lean())!;
    const r = await ingest(mem('oj-samples', [{ externalId: 'brackets', title: 'Balanced Brackets (fixed)', statement: 's', testcases: [{ input: '()', output: 'yes' }] }]), { createdBy: setterId, makePublic: false });
    expect(r.updated).toBe(1);
    const after = (await ProblemModel.findOne({ 'source.externalId': 'brackets' }).lean())!;
    expect(after.title).toBe('Balanced Brackets (fixed)');
    expect(after.slug).toBe(before.slug); // the url never changes under a learner
    expect(after.isPublic).toBe(true); // a re-run never flips visibility
    expect(after.testcaseSetVersion).not.toBe(before.testcaseSetVersion);
    expect(await TestcaseModel.countDocuments({ problemId: after._id })).toBe(1);
  });
  it('a slug collision from another source gets a suffix', async () => {
    const r = await ingest(mem('other-site', [{ externalId: '9', title: 'Count the Vowels', statement: 's', testcases: [{ input: 'a', output: '1' }] }]), { createdBy: setterId, makePublic: false });
    expect(r.inserted).toBe(1);
    expect(await ProblemModel.exists({ slug: 'count-the-vowels-2' })).toBeTruthy();
  });
  it('one bad problem does not sink the batch', async () => {
    const r = await ingest(mem('x', [{ externalId: 'bad', title: 'no cases', statement: 's', testcases: [] }, { externalId: 'ok', title: 'fine', statement: 's', testcases: [{ input: '1', output: '1' }] }]), { createdBy: setterId, makePublic: false });
    expect(r.inserted).toBe(1);
    expect(r.failed).toEqual([{ externalId: 'bad', error: expect.stringMatching(/at least one/) }]);
  });
});
