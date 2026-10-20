import { Router } from 'express';
import { SubmissionModel, UserModel } from '@oj/db';
import { notFound } from '../errors.js';

export const usersRouter = Router();

usersRouter.get('/:username', async (req, res, next) => {
  try {
    const u = await UserModel.findOne({ username: String(req.params['username']).toLowerCase(), deletedAt: null }).lean();
    if (!u) throw notFound('user');
    const [total, accepted] = await Promise.all([
      SubmissionModel.countDocuments({ userId: u._id }),
      SubmissionModel.countDocuments({ userId: u._id, status: 'AC' }),
    ]);
    res.json({ user: { username: u.username, rating: u.rating, solvedCount: u.solvedCount, joinedAt: u.createdAt }, stats: { total, accepted } });
  } catch (e) { next(e); }
});
