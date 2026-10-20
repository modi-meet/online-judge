import { PENDING } from '@oj/contracts';
import { SubmissionModel } from '@oj/db';

/**
 * bullmq redelivers on lock expiry, but a row can still be stranded — created,
 * then the enqueue failed. every minute: re-enqueue old pending rows, or give
 * up after three attempts. lld §7.5. this is what the partial index is for.
 */
export async function sweepStuck(enqueue: (submissionId: string) => Promise<unknown>, olderThanMs = 5 * 60_000) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const stuck = await SubmissionModel.find({ status: { $in: [...PENDING] }, submittedAt: { $lt: cutoff } }).select('_id attempts').lean();
  let requeued = 0;
  let failed = 0;
  for (const s of stuck) {
    if (s.attempts < 3) {
      await SubmissionModel.updateOne({ _id: s._id }, { $set: { status: 'QUEUED' } });
      await enqueue(String(s._id));
      requeued++;
    } else {
      await SubmissionModel.updateOne({ _id: s._id, status: { $in: [...PENDING] } }, { $set: { status: 'IE', judgedAt: new Date(), stderrTail: 'gave up after 3 attempts' } });
      failed++;
    }
  }
  return { requeued, failed };
}
