import { Schema, model, type InferSchemaType } from 'mongoose';
import { LANGUAGES, PENDING, STATUSES } from '@oj/contracts';

const submissionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
  contestId: { type: Schema.Types.ObjectId, ref: 'Contest', default: null },
  language: { type: String, enum: LANGUAGES, required: true },
  /** s3 key, or `inline:` prefix in v0/v1. large code is never embedded. */
  codeRef: { type: String, required: true },
  status: { type: String, enum: STATUSES, default: 'QUEUED', required: true },
  failedTestcaseIdx: { type: Number, default: null },
  passedCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  timeMs: { type: Number, default: null },
  memoryKb: { type: Number, default: null },
  compilerLog: { type: String, default: '' },
  stderrTail: { type: String, default: '' },
  attempts: { type: Number, default: 0 },
  judgedBy: { type: String, default: null },
  submittedAt: { type: Date, default: () => new Date() },
  judgedAt: { type: Date, default: null },
});

// "my submissions"
submissionSchema.index({ userId: 1, submittedAt: -1 });
// "have i solved this?" badge
submissionSchema.index({ problemId: 1, userId: 1, status: 1 });
// projector rebuild, replay in order
submissionSchema.index({ contestId: 1, submittedAt: 1 });
// stuck-job sweeper. partial so it only indexes in-flight rows.
submissionSchema.index(
  { status: 1, submittedAt: 1 },
  { partialFilterExpression: { status: { $in: [...PENDING] } } },
);

export type Submission = InferSchemaType<typeof submissionSchema>;
export const SubmissionModel = model('Submission', submissionSchema, 'submissions');
