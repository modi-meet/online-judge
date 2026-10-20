import { ProblemModel, TestcaseModel } from '@oj/db';
import type { Types } from '@oj/db';
import type { Adapter } from './adapters/types.js';
import { normalize } from './normalize.js';

export interface IngestResult { inserted: number; updated: number; unchanged: number; failed: { externalId: string; error: string }[] }

/**
 * upsert on (source.site, source.externalId): re-running an adapter is a
 * no-op unless the source changed. test cases are replaced only when the
 * set version moved, so a title fix does not invalidate worker caches.
 * a slug collision with a problem from another source gets a suffix.
 */
export async function ingest(adapter: Adapter, opts: { createdBy: Types.ObjectId; makePublic: boolean }): Promise<IngestResult> {
  const r: IngestResult = { inserted: 0, updated: 0, unchanged: 0, failed: [] };
  for await (const raw of adapter.problems()) {
    try {
      const n = normalize(raw, adapter.site);
      const existing = await ProblemModel.findOne({ 'source.site': adapter.site, 'source.externalId': raw.externalId }).lean();
      let slug = existing?.slug ?? n.slug;
      if (!existing) {
        for (let i = 2; await ProblemModel.exists({ slug }); i++) slug = `${n.slug}-${i}`;
      }
      const set = { ...n.fields, slug, source: n.source, testcaseSetVersion: n.testcaseSetVersion, ...(existing ? {} : { isPublic: opts.makePublic, createdBy: opts.createdBy }) };
      if (existing) delete (set as { isPublic?: boolean }).isPublic; // never flip visibility on a re-run
      const doc = await ProblemModel.findOneAndUpdate(
        { 'source.site': adapter.site, 'source.externalId': raw.externalId },
        { $set: set },
        { upsert: true, new: true },
      );
      if (!existing || existing.testcaseSetVersion !== n.testcaseSetVersion) {
        await TestcaseModel.deleteMany({ problemId: doc._id });
        await TestcaseModel.insertMany(n.testcases.map((t) => ({ problemId: doc._id, idx: t.idx, isSample: t.isSample, inputRef: `inline:${t.input}`, outputRef: `inline:${t.output}`, bytes: t.input.length + t.output.length })));
      }
      if (!existing) r.inserted++;
      else if (existing.testcaseSetVersion !== n.testcaseSetVersion || existing.title !== n.fields.title || existing.statement !== n.fields.statement) r.updated++;
      else r.unchanged++;
    } catch (e) {
      r.failed.push({ externalId: raw.externalId, error: (e as Error).message });
    }
  }
  return r;
}
