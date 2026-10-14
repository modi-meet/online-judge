import { Schema, model, type InferSchemaType } from 'mongoose';

const problemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    statement: { type: String, required: true },
    inputFormat: { type: String, default: '' },
    outputFormat: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    tags: { type: [String], default: [] },
    timeLimitMs: { type: Number, default: 1000 },
    memoryLimitMb: { type: Number, default: 256 },
    checkerType: { type: String, enum: ['exact', 'trim', 'float', 'custom'], default: 'trim' },
    floatEps: { type: Number },
    /** hash of the testcase set. a bump invalidates every worker's local cache. */
    testcaseSetVersion: { type: String, default: '' },
    source: {
      site: String,
      url: String,
      externalId: String,
      license: String,
    },
    isPublic: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

// catalogue list + cursor pagination
problemSchema.index({ isPublic: 1, difficulty: 1, _id: -1 });
problemSchema.index({ tags: 1 });
// ingestor upsert key; sparse so original problems do not collide on null
problemSchema.index({ 'source.site': 1, 'source.externalId': 1 }, { unique: true, sparse: true });

export type Problem = InferSchemaType<typeof problemSchema>;
export const ProblemModel = model('Problem', problemSchema, 'problems');
