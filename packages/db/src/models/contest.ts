import { Schema, model, type InferSchemaType } from 'mongoose';

const contestSchema = new Schema({
  title: { type: String, required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  problems: [
    {
      problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
      points: { type: Number, default: 100 },
    },
  ],
  scoring: { type: String, enum: ['icpc', 'ioi'], default: 'icpc' },
  aiMentorEnabled: { type: Boolean, default: false },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

contestSchema.index({ startAt: -1 });

export type Contest = InferSchemaType<typeof contestSchema>;
export const ContestModel = model('Contest', contestSchema, 'contests');
