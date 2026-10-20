import { Router } from 'express';
import { z } from 'zod';
import { ListQuery, ProblemBody, TestcaseBody, objectId } from '@oj/contracts';
import { ProblemModel, TestcaseModel, Types } from '@oj/db';
import { putOrInline, type ObjectStore } from '@oj/storage';
import { AppError, notFound } from '../errors.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export function problemsRouter(store: ObjectStore) {
const problemsRouter = Router();

const enc = (id: Types.ObjectId) => Buffer.from(String(id)).toString('base64url');
const dec = (c: string) => {
  const s = Buffer.from(c, 'base64url').toString();
  if (!Types.ObjectId.isValid(s)) throw new AppError('VALIDATION_FAILED', 'bad cursor');
  return new Types.ObjectId(s);
};

// cursor pagination, never skip. lld §4.4
problemsRouter.get('/', authenticate, validate('query', ListQuery), async (req, res, next) => {
  try {
    const q = req.query as unknown as ListQuery;
    const filter: Record<string, unknown> = {};
    const isSetter = req.user && req.user.role !== 'user';
    if (!isSetter) filter['isPublic'] = true;
    if (q.difficulty) filter['difficulty'] = q.difficulty;
    if (q.tag) filter['tags'] = q.tag;
    if (q.q) filter['title'] = { $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (q.cursor) filter['_id'] = { $lt: dec(q.cursor) };

    const rows = await ProblemModel.find(filter)
      .sort({ _id: -1 })
      .limit(q.limit + 1)
      .select('slug title difficulty tags isPublic')
      .lean();
    const page = rows.slice(0, q.limit);
    res.json({
      items: page.map((p) => ({ id: String(p._id), slug: p.slug, title: p.title, difficulty: p.difficulty, tags: p.tags, isPublic: p.isPublic })),
      nextCursor: rows.length > q.limit ? enc(page[page.length - 1]!._id) : null,
    });
  } catch (e) { next(e); }
});

// statement, limits, and sample test cases only. hidden cases never leave the server.
problemsRouter.get('/:slug', authenticate, async (req, res, next) => {
  try {
    const p = await ProblemModel.findOne({ slug: req.params['slug'] }).lean();
    const isSetter = req.user && req.user.role !== 'user';
    if (!p || (!p.isPublic && !isSetter)) throw notFound('problem');
    const samples = await TestcaseModel.find({ problemId: p._id, isSample: true }).sort({ idx: 1 }).lean();
    res.json({
      problem: {
        id: String(p._id), slug: p.slug, title: p.title, statement: p.statement,
        inputFormat: p.inputFormat, outputFormat: p.outputFormat, difficulty: p.difficulty,
        tags: p.tags, timeLimitMs: p.timeLimitMs, memoryLimitMb: p.memoryLimitMb, isPublic: p.isPublic,
      },
      samples: await Promise.all(samples.map(async (t) => ({ idx: t.idx, input: await store.get(t.inputRef), output: await store.get(t.outputRef) }))),
    });
  } catch (e) { next(e); }
});

problemsRouter.post('/', authenticate, authorize('setter'), validate('body', ProblemBody), async (req, res, next) => {
  try {
    const body = req.body as ProblemBody;
    const dup = await ProblemModel.exists({ slug: body.slug });
    if (dup) throw new AppError('CONFLICT', 'slug already exists');
    const p = await ProblemModel.create({ ...body, createdBy: req.user!.sub });
    res.status(201).json({ id: String(p._id), slug: p.slug });
  } catch (e) { next(e); }
});

const IdParam = z.object({ id: objectId });
const TestcasesBody = z.object({ testcases: z.array(TestcaseBody).min(1).max(200) });

// replaces the whole set. inline storage until v2 moves data to s3.
problemsRouter.put('/:id/testcases', authenticate, authorize('setter'), validate('params', IdParam), validate('body', TestcasesBody), async (req, res, next) => {
  try {
    const id = (req.params as { id: string }).id;
    const p = await ProblemModel.findById(id);
    if (!p) throw notFound('problem');
    const { testcases } = req.body as z.infer<typeof TestcasesBody>;
    await TestcaseModel.deleteMany({ problemId: p._id });
    // a version bump invalidates every worker's cache of the old set
    const { createHash } = await import('node:crypto');
    const version = createHash('sha256').update(JSON.stringify(testcases)).digest('hex').slice(0, 16);
    await TestcaseModel.insertMany(
      await Promise.all(testcases.map(async (t, idx) => ({
        problemId: p._id, idx, isSample: t.isSample,
        inputRef: await putOrInline(store, `testcases/${String(p._id)}/${version}/${idx}.in`, t.input),
        outputRef: await putOrInline(store, `testcases/${String(p._id)}/${version}/${idx}.out`, t.output),
        bytes: Buffer.byteLength(t.input) + Buffer.byteLength(t.output),
      }))),
    );
    p.testcaseSetVersion = version;
    await p.save();
    res.json({ count: testcases.length, testcaseSetVersion: p.testcaseSetVersion });
  } catch (e) { next(e); }
});
return problemsRouter;
}
