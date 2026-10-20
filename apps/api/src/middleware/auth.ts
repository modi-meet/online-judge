import type { RequestHandler } from 'express';
import { forbidden, unauthenticated } from '../errors.js';
import { verifyAccess, type AccessClaims } from '../services/auth.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessClaims;
  }
}

/** never rejects. only populates req.user. rejection is authorize's job. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const h = req.header('authorization');
  if (h?.startsWith('Bearer ')) {
    const claims = verifyAccess(h.slice(7));
    if (claims) req.user = claims;
  }
  next();
};

type Role = AccessClaims['role'];
const rank: Record<Role, number> = { user: 0, setter: 1, admin: 2 };

export function authorize(min: Role = 'user'): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthenticated());
    if (rank[req.user.role] < rank[min]) return next(forbidden());
    next();
  };
}
