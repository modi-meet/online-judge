import { Schema, model, type InferSchemaType } from 'mongoose';

// one row per testcase execution. debugging and the complexity auditor read it.
const judgeRunSchema = new Schema({
  submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
  testcaseIdx: { type: Number, required: true },
  cpuMs: { type: Number, required: true },
  wallMs: { type: Number, required: true },
  peakMemKb: { type: Number, default: null },
  exitCode: { type: Number, default: null },
  signal: { type: String, default: null },
  verdict: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
});

judgeRunSchema.index({ submissionId: 1, testcaseIdx: 1 });
judgeRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 14 * 24 * 3600 });

export type JudgeRun = InferSchemaType<typeof judgeRunSchema>;
export const JudgeRunModel = model('JudgeRun', judgeRunSchema, 'judge_runs');
