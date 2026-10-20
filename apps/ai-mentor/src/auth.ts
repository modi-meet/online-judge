import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { AppError } from './errors.js';

// the same hs256 access token the api issues. the mentor verifies it with the
// shared secret and never talks to the api — a dead api must not take the
// mentor down with it, and vice versa.
export interface AccessClaims { sub: string; role: 'user' | 'setter' | 'admin'; jti: string }

declare module 'express-serve-static-core' {
  interface Request { user?: AccessClaims }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const h = req.header('authorization');
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }) as AccessClaims; } catch { /* anonymous */ }
  }
  next();
};

export const requireUser: RequestHandler = (req, _res, next) => (req.user ? next() : next(new AppError('UNAUTHENTICATED', 'sign in required')));
