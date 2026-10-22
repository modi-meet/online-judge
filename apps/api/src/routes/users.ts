import { Router } from 'express';
import { UpdateProfileBody } from '@oj/contracts';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ProblemModel, SubmissionModel, UserModel } from '@oj/db';
import { notFound } from '../errors.js';

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.patch('/me', authorize(), validate('body', UpdateProfileBody), async (req, res, next) => {
  try {
    const u = await UserModel.findByIdAndUpdate(req.user!.sub, { $set: req.body as UpdateProfileBody }, { new: true }).lean();
    if (!u) throw notFound('user');
    res.json({ user: { displayName: u.displayName, bio: u.bio, location: u.location, avatar: u.avatar } });
  } catch (e) { next(e); }
});

usersRouter.get('/:username', async (req, res, next) => {
  try {
    const u = await UserModel.findOne({ username: String(req.params['username']).toLowerCase(), deletedAt: null }).lean();
    if (!u) throw notFound('user');
    const [total, accepted] = await Promise.all([
      SubmissionModel.countDocuments({ userId: u._id }),
      SubmissionModel.countDocuments({ userId: u._id, status: 'AC' }),
    ]);
    const recent = await SubmissionModel.find({ userId: u._id }).sort({ submittedAt: -1 }).limit(20).select('problemId language status timeMs submittedAt').lean();
    const probs = await ProblemModel.find({ _id: { $in: recent.map((s) => s.problemId) } }).select('slug title').lean();
    const byId = new Map(probs.map((p) => [String(p._id), p]));
    res.json({
      user: {
        username: u.username, displayName: u.displayName, bio: u.bio, location: u.location, avatar: u.avatar,
        role: u.role, rating: u.rating, solvedCount: u.solvedCount, joinedAt: u.createdAt,
        // email is private: only the owner sees it
        ...(req.user?.sub === String(u._id) ? { email: u.email } : {}),
      },
      stats: { total, accepted },
      recent: recent.map((s) => ({ id: String(s._id), slug: byId.get(String(s.problemId))?.slug ?? null, title: byId.get(String(s.problemId))?.title ?? '?', language: s.language, status: s.status, timeMs: s.timeMs, submittedAt: s.submittedAt })),
    });
  } catch (e) { next(e); }
});
