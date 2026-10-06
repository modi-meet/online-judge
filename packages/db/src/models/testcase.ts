import { Schema, model, type InferSchemaType } from 'mongoose';

const testcaseSchema = new Schema({
  problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
  idx: { type: Number, required: true },
  isSample: { type: Boolean, default: false },
  /** v1: inline strings. v2: s3 keys. same field, the ref prefix tells them apart. */
  inputRef: { type: String, required: true },
  outputRef: { type: String, required: true },
  bytes: { type: Number, default: 0 },
});

// the worker fetches the ordered set
testcaseSchema.index({ problemId: 1, idx: 1 }, { unique: true });

export type Testcase = InferSchemaType<typeof testcaseSchema>;
export const TestcaseModel = model('Testcase', testcaseSchema, 'testcases');
