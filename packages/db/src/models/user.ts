import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'setter', 'admin'], default: 'user' },
    rating: { type: Number, default: 0 },
    solvedCount: { type: Number, default: 0 },
    displayName: { type: String, default: '', trim: true },
    bio: { type: String, default: '', trim: true },
    location: { type: String, default: '', trim: true },
    avatar: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema, 'users');
