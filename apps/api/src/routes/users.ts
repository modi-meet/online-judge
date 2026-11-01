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
    // a year of activity, one row per day with a submission (utc days)
    const since = new Date(Date.now() - 371 * 86_400_000);
    const [days, langs, solvedIds] = await Promise.all([
      SubmissionModel.aggregate<{ _id: string; n: number }>([
        { $match: { userId: u._id, submittedAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } }, n: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      SubmissionModel.aggregate<{ _id: string; n: number }>([{ $match: { userId: u._id } }, { $group: { _id: '$language', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
      SubmissionModel.distinct('problemId', { userId: u._id, status: 'AC' }),
    ]);
    const solvedDiff = await ProblemModel.aggregate<{ _id: string; n: number }>([{ $match: { _id: { $in: solvedIds } } }, { $group: { _id: '$difficulty', n: { $sum: 1 } } }]);
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
      stats: { total, accepted, ...streaks(days.map((d) => d._id)) },
      activity: days.map((d) => ({ date: d._id, count: d.n })),
      languages: langs.map((l) => ({ language: l._id, count: l.n })),
      solvedByDifficulty: Object.fromEntries(['easy', 'medium', 'hard'].map((d) => [d, solvedDiff.find((x) => x._id === d)?.n ?? 0])),
      contests: [...(u.ratingHistory ?? [])].reverse().map((h) => ({ contestId: String(h.contestId), title: h.title, at: h.at, rank: h.rank, of: h.of, solved: h.solved, penalty: h.penalty, delta: h.delta, rating: h.rating })),
      recent: recent.map((s) => ({ id: String(s._id), slug: byId.get(String(s.problemId))?.slug ?? null, title: byId.get(String(s.problemId))?.title ?? '?', language: s.language, status: s.status, timeMs: s.timeMs, submittedAt: s.submittedAt })),
    });
  } catch (e) { next(e); }
});

/** current and longest run of consecutive days with at least one submission. today or yesterday keeps a run alive. */
function streaks(days: string[]) {
  const set = new Set(days);
  const key = (t: number) => new Date(t).toISOString().slice(0, 10);
  let longest = 0; let run = 0; let prev = '';
  for (const d of days) {
    run = prev && key(Date.parse(prev) + 86_400_000) === d ? run + 1 : 1;
    longest = Math.max(longest, run); prev = d;
  }
  let current = 0; let t = Date.now();
  if (!set.has(key(t))) t -= 86_400_000;
  while (set.has(key(t))) { current++; t -= 86_400_000; }
  return { currentStreak: current, longestStreak: longest };
}
