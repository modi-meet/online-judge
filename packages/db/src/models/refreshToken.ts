import { Schema, model, type InferSchemaType } from 'mongoose';

// rotation with reuse detection. the token itself is never stored, only its hash.
const refreshTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true, unique: true },
  familyId: { type: String, required: true },
  replacedBy: { type: Schema.Types.ObjectId, default: null },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  createdAt: { type: Date, default: () => new Date() },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
});

refreshTokenSchema.index({ familyId: 1 });
// mongo deletes expired rows itself
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshToken = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema, 'refresh_tokens');
