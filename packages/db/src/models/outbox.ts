import { Schema, model, type InferSchemaType } from 'mongoose';

// transactional outbox. a verdict row and its event are written in one
// transaction; a relay publishes unsent rows. see lld §7.6
const outboxSchema = new Schema({
  aggregateId: { type: String, required: true },
  topic: { type: String, required: true },
  key: { type: String, required: true },
  envelope: { type: Schema.Types.Mixed, required: true },
  sentAt: { type: Date, default: null },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: () => new Date() },
});

// relay scan: only unsent rows are indexed
outboxSchema.index({ createdAt: 1 }, { partialFilterExpression: { sentAt: null } });

export type Outbox = InferSchemaType<typeof outboxSchema>;
export const OutboxModel = model('Outbox', outboxSchema, 'outbox');
