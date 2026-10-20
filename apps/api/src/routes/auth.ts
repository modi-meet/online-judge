import { Router, type CookieOptions } from 'express';
import { LoginBody, RegisterBody } from '@oj/contracts';
import { config } from '../config.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { unauthenticated } from '../errors.js';
import * as auth from '../services/auth.js';
import { UserModel } from '@oj/db';

export const authRouter = Router();

const COOKIE = 'oj_refresh';
const cookieOpts: CookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: config.REFRESH_TTL_SEC * 1000,
};
const meta = (req: { header(n: string): string | undefined; ip?: string | undefined }) => ({
  userAgent: req.header('user-agent') ?? '',
  ip: req.ip ?? '',
});
const publicUser = (u: { _id: unknown; username: string; email: string; role: string; rating: number; solvedCount: number }) => ({
  id: String(u._id), username: u.username, email: u.email, role: u.role, rating: u.rating, solvedCount: u.solvedCount,
});

authRouter.post('/register', rateLimit('login'), validate('body', RegisterBody), async (req, res, next) => {
  try {
    const { username, email, password } = req.body as RegisterBody;
    const user = await auth.register(username, email, password);
    const { token } = await auth.issueRefresh(String(user._id), auth.newFamilyId(), meta(req));
    res.cookie(COOKIE, token, cookieOpts);
    res.status(201).json({ accessToken: auth.signAccess(String(user._id), user.role), user: publicUser(user) });
  } catch (e) { next(e); }
});

authRouter.post('/login', rateLimit('login'), validate('body', LoginBody), async (req, res, next) => {
  try {
    const { username, password } = req.body as LoginBody;
    const user = await auth.login(username, password);
    const { token } = await auth.issueRefresh(String(user._id), auth.newFamilyId(), meta(req));
    res.cookie(COOKIE, token, cookieOpts);
    res.json({ accessToken: auth.signAccess(String(user._id), user.role), user: publicUser(user) });
  } catch (e) { next(e); }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const presented = (req.cookies as Record<string, string | undefined>)[COOKIE];
    if (!presented) throw unauthenticated();
    const r = await auth.rotateRefresh(presented, meta(req));
    res.cookie(COOKIE, r.refresh, cookieOpts);
    res.json({ accessToken: r.access, user: publicUser(r.user) });
  } catch (e) {
    res.clearCookie(COOKIE, { path: cookieOpts.path });
    next(e);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const presented = (req.cookies as Record<string, string | undefined>)[COOKIE];
    if (presented) await auth.revokeFamily(presented);
    res.clearCookie(COOKIE, { path: cookieOpts.path });
    res.status(204).end();
  } catch (e) { next(e); }
});

authRouter.get('/me', authenticate, authorize(), async (req, res, next) => {
  try {
    const u = await UserModel.findById(req.user!.sub).lean();
    if (!u) throw unauthenticated();
    res.json({ user: publicUser(u) });
  } catch (e) { next(e); }
});
