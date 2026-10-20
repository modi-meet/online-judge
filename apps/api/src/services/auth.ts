import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RefreshTokenModel, UserModel } from '@oj/db';
import { AppError } from '../errors.js';
import { config } from '../config.js';

export interface AccessClaims {
  sub: string;
  role: 'user' | 'setter' | 'admin';
  jti: string;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function signAccess(userId: string, role: AccessClaims['role']) {
  const claims: AccessClaims = { sub: userId, role, jti: randomUUID() };
  return jwt.sign(claims, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: config.ACCESS_TTL_SEC });
}

export function verifyAccess(token: string): AccessClaims | null {
  try {
    return jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }) as AccessClaims;
  } catch {
    return null;
  }
}

/** issues an opaque refresh token; only its hash is stored. */
export async function issueRefresh(userId: string, familyId: string, meta: { userAgent: string; ip: string }) {
  const token = randomBytes(32).toString('base64url');
  const row = await RefreshTokenModel.create({
    userId,
    tokenHash: sha256(token),
    familyId,
    expiresAt: new Date(Date.now() + config.REFRESH_TTL_SEC * 1000),
    ...meta,
  });
  return { token, rowId: row._id };
}

/**
 * rotation with reuse detection (lld §4.2). a token that already has
 * `replacedBy` was stolen and replayed: the whole family is revoked.
 */
export async function rotateRefresh(presented: string, meta: { userAgent: string; ip: string }) {
  const row = await RefreshTokenModel.findOne({ tokenHash: sha256(presented) });
  if (!row || row.expiresAt < new Date() || row.revokedAt) throw new AppError('UNAUTHENTICATED', 'refresh token invalid');
  if (row.replacedBy) {
    await RefreshTokenModel.updateMany({ familyId: row.familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    throw new AppError('TOKEN_REUSE_DETECTED', 'refresh token reuse detected; sign in again');
  }
  const next = await issueRefresh(String(row.userId), row.familyId, meta);
  row.replacedBy = next.rowId;
  await row.save();
  const user = await UserModel.findById(row.userId).lean();
  if (!user || user.deletedAt) throw new AppError('UNAUTHENTICATED', 'account unavailable');
  return { refresh: next.token, access: signAccess(String(user._id), user.role), user };
}

export async function revokeFamily(presented: string) {
  const row = await RefreshTokenModel.findOne({ tokenHash: sha256(presented) });
  if (!row) return;
  await RefreshTokenModel.updateMany({ familyId: row.familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function register(username: string, email: string, password: string) {
  const taken = await UserModel.findOne({ $or: [{ username }, { email }] }).lean();
  if (taken) throw new AppError('CONFLICT', taken.username === username ? 'username taken' : 'email already registered');
  const passwordHash = await bcrypt.hash(password, 10);
  return UserModel.create({ username, email, passwordHash });
}

export async function login(username: string, password: string) {
  const user = await UserModel.findOne({ username: username.toLowerCase(), deletedAt: null });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new AppError('UNAUTHENTICATED', 'wrong username or password');
  return user;
}

export const newFamilyId = () => randomUUID();
