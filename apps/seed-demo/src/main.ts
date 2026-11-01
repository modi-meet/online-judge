import { readFileSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcryptjs';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { connect, disconnect, mongoose, ContestModel, ProblemModel, RefreshTokenModel, SubmissionModel, TestcaseModel, UserModel } from '@oj/db';
import { applyVerdict, projectVerdict, resetStandings, score, type UserState } from '@oj/judge';
import { CONTESTS, DEMO_PASSWORD, PEOPLE, type Person } from './people.js';
import { hash, problemRating, rank, ratingDeltas, rng, solveChance, wrongAttempts, type Rng } from './sim.js';

// the demo seed is a job: it builds a believable community on top of the
// problem bank. 22 people practise from the day they joined, take part in
// seven past contests, and end up with ratings their results earned. it is
// idempotent: a re-run removes its own users and contests first.
//   pnpm --filter @oj/seed-demo bank && pnpm --filter @oj/ingestor ingest -- --file ../seed-demo/out/dsa-bundle.json --public
//   pnpm --filter @oj/seed-demo seed
loadEnv({ path: new URL('../../../.env', import.meta.url) });
const env = z.object({ MONGO_URI: z.string().min(1), REDIS_URL: z.string().min(1) }).safeParse(process.env);
if (!env.success) { console.error('MONGO_URI and REDIS_URL are required'); process.exit(1); }

type Lang = 'cpp17' | 'python3';
type Verdict = 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE';
interface Prob { id: mongoose.Types.ObjectId; key: string; slug: string; difficulty: 'easy' | 'medium' | 'hard'; rating: number; tests: number; limitMs: number; code: Record<Lang, string> }
interface Sub {
  _id: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; problemId: mongoose.Types.ObjectId; contestId: mongoose.Types.ObjectId | null;
  language: Lang; codeRef: string; status: Verdict; failedTestcaseIdx: number | null; passedCount: number; totalCount: number;
  timeMs: number | null; memoryKb: number | null; compilerLog: string; stderrTail: string; attempts: number; judgedBy: string;
  submittedAt: Date; judgedAt: Date;
}

const DAY = 86_400_000; const MIN = 60_000;
const NOW = Date.now();
const solutionsPath = new URL('../out/solutions.json', import.meta.url);
const solutions = JSON.parse(readFileSync(solutionsPath, 'utf8')) as Record<string, Record<Lang, string>>;

// ---------------------------------------------------------------- code a person would plausibly have written

/** the same solution with the kind of slip that produces the verdict */
function slipped(code: string, lang: Lang, v: Verdict): { code: string; log: string; stderr: string } {
  if (v === 'CE' && lang === 'cpp17') {
    const lines = code.split('\n');
    const start = lines.findIndex((l) => /\bmain\s*\(/.test(l));
    const at = lines.findIndex((l, i) => i > start && /;\s*$/.test(l) && !/^\s*(for|#)/.test(l));
    if (at > 0) {
      const line = lines[at]!; const col = line.lastIndexOf(';');
      lines[at] = line.slice(0, col) + line.slice(col + 1);
      const next = (lines[at + 1] ?? '').trim().split(/\s+/)[0] ?? '}';
      return { code: lines.join('\n'), log: `main.cpp: In function 'int main()':\nmain.cpp:${at + 1}:${col + 1}: error: expected ';' before '${next}'\n`, stderr: '' };
    }
  }
  let out = code;
  if (v === 'WA') {
    for (const [a, b] of lang === 'cpp17' ? [['long long', 'int'], ['<=', '<'], ['+ 1', '']] : [['<=', '<'], ['+ 1', ''], ['>=', '>']]) {
      if (out.includes(a!)) { out = out.replace(a!, b!); break; }
    }
  }
  const stderr = v !== 'RE' ? '' : lang === 'python3'
    ? `Traceback (most recent call last):\n  File "main.py", line ${3 + (hash(code) % Math.max(1, code.split('\n').length - 3))}, in <module>\nIndexError: list index out of range\n`
    : '';
  return { code: out, log: '', stderr };
}

function wrongVerdict(r: Rng, lang: Lang): Verdict {
  return lang === 'cpp17'
    ? r.weighted<Verdict>(['WA', 'TLE', 'RE', 'CE', 'MLE'], (v) => ({ WA: 62, TLE: 14, RE: 12, CE: 8, MLE: 4, AC: 0 })[v])
    : r.weighted<Verdict>(['WA', 'TLE', 'RE'], (v) => ({ WA: 55, TLE: 30, RE: 15, CE: 0, MLE: 0, AC: 0 })[v]);
}

function makeSub(r: Rng, user: { _id: mongoose.Types.ObjectId }, p: Prob, lang: Lang, v: Verdict, at: Date, contestId: mongoose.Types.ObjectId | null): Sub {
  const slip = v === 'AC' ? { code: p.code[lang], log: '', stderr: '' } : slipped(p.code[lang], lang, v);
  const failed = v === 'AC' || v === 'CE' ? null : r.int(v === 'WA' ? 1 : Math.min(2, p.tests - 1), Math.max(1, p.tests - 1));
  const fast = lang === 'cpp17';
  const timeMs = v === 'CE' ? null : v === 'TLE' ? p.limitMs
    : Math.round((fast ? r.int(0, 40) + p.rating / 60 : r.int(40, 220) + p.rating / 4) * (v === 'AC' ? 1 : 0.6));
  const memoryKb = v === 'CE' ? null : v === 'MLE' ? 262_144 : fast ? r.int(3_400, 9_000) + (p.rating > 1700 ? r.int(0, 22_000) : 0) : r.int(9_800, 16_000) + (p.rating > 1700 ? r.int(0, 30_000) : 0);
  return {
    _id: new mongoose.Types.ObjectId(Math.floor(at.getTime() / 1000)),
    userId: user._id, problemId: p.id, contestId, language: lang,
    codeRef: `inline:${slip.code}`, status: v,
    failedTestcaseIdx: failed, passedCount: v === 'AC' ? p.tests : failed ?? 0, totalCount: v === 'CE' ? 0 : p.tests,
    timeMs, memoryKb, compilerLog: slip.log, stderrTail: slip.stderr, attempts: 1, judgedBy: `judge-${1 + (hash(String(at.getTime())) % 3)}`,
    submittedAt: at, judgedAt: new Date(at.getTime() + 600 + r.int(0, 2400) + (v === 'TLE' ? p.limitMs * 2 : 0)),
  };
}

const langFor = (r: Rng, who: Person): Lang => (who.otherLang && r.chance(who.otherLang) ? (who.lang === 'cpp17' ? 'python3' : 'cpp17') : who.lang);

// ---------------------------------------------------------------- main

await connect(env.data.MONGO_URI);
const redis = new Redis(env.data.REDIS_URL);

const docs = await ProblemModel.find({ 'source.site': 'oj-dsa', isPublic: true }).select('_id slug difficulty timeLimitMs source.externalId').lean();
if (docs.length < 60) { console.error(`only ${docs.length} bank problems found; build and ingest the bank first`); process.exit(1); }
const counts = new Map((await TestcaseModel.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([{ $match: { problemId: { $in: docs.map((d) => d._id) } } }, { $group: { _id: '$problemId', n: { $sum: 1 } } }])).map((c) => [String(c._id), c.n]));
const problems: Prob[] = docs.filter((d) => solutions[d.source!.externalId!]).map((d) => ({
  id: d._id, key: d.source!.externalId!, slug: d.slug, difficulty: d.difficulty as Prob['difficulty'],
  rating: problemRating(d.source!.externalId!, d.difficulty as Prob['difficulty']), tests: counts.get(String(d._id)) ?? 6, limitMs: d.timeLimitMs ?? 1000,
  code: solutions[d.source!.externalId!]!,
}));
console.log(`${problems.length} bank problems`);

// clear a previous run
const old = await UserModel.find({ username: { $in: PEOPLE.map((p) => p.username) } }).select('_id').lean();
const oldContests = await ContestModel.find({ title: { $in: CONTESTS.map((c) => c.title) } }).select('_id').lean();
await SubmissionModel.deleteMany({ $or: [{ userId: { $in: old.map((u) => u._id) } }, { contestId: { $in: oldContests.map((c) => c._id) } }] });
await RefreshTokenModel.deleteMany({ userId: { $in: old.map((u) => u._id) } });
await UserModel.deleteMany({ _id: { $in: old.map((u) => u._id) } });
for (const c of oldContests) await resetStandings(redis, String(c._id));
await ContestModel.deleteMany({ _id: { $in: oldContests.map((c) => c._id) } });

// people
const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
const r0 = rng(20260823);
const users = PEOPLE.map((p) => {
  const joined = new Date(`${p.joined}T00:00:00Z`).getTime() + (r0.int(9, 22) - p.tz) * 3_600_000 + r0.int(0, 59) * MIN;
  const [first, ...rest] = p.displayName.normalize('NFKD').replace(/[^\w\s]/g, '').toLowerCase().split(' ');
  return {
    _id: new mongoose.Types.ObjectId(Math.floor(joined / 1000)), person: p, joined,
    doc: {
      username: p.username, email: `${first}.${rest.join('')}@example.com`, passwordHash, role: 'user',
      displayName: p.displayName, bio: p.bio, location: p.location, avatar: '',
      rating: 0, solvedCount: 0, ratingHistory: [] as unknown[], deletedAt: null, createdAt: new Date(joined),
    },
  };
});

// contests: reserve problems so nobody "practises" a round's problems before it happens
const rc = rng(7);
const pool = { easy: problems.filter((p) => p.difficulty === 'easy'), medium: problems.filter((p) => p.difficulty === 'medium'), hard: problems.filter((p) => p.difficulty === 'hard') };
const take = (d: keyof typeof pool) => { const xs = pool[d]; return xs.splice(rc.int(0, xs.length - 1), 1)[0]!; };
const contests = CONTESTS.map((c) => {
  const shape: (keyof typeof pool)[] = c.size === 6 ? ['easy', 'medium', 'medium', 'medium', 'hard', 'hard'] : ['easy', 'easy', 'medium', 'medium', 'hard'];
  const set = shape.map(take).sort((a, b) => a.rating - b.rating);
  const start = new Date(`${c.date}T14:30:00Z`);
  return { _id: new mongoose.Types.ObjectId(Math.floor(start.getTime() / 1000)), plan: c, start, end: new Date(start.getTime() + c.minutes * MIN), set };
});
const reservedUntil = new Map<string, number>();
for (const c of contests) for (const p of c.set) reservedUntil.set(String(p.id), c.end.getTime());

const subs: Sub[] = [];
const solvedAt = new Map<string, number>(); // `${user}:${problem}` → first ac time
const tries = new Map<string, number>();    // `${user}:${problem}` → practice sessions that ended without an accept

// contests first: a round is a fixed event, practice fills the days around it
for (const c of contests) {
  const r = rng(hash(c.plan.title));
  for (const u of users) {
    const p = u.person;
    const form = p.skill + r.normal() * 110;            // good day or bad day
    let clock = r.int(1, 4) * MIN;                       // reading the first statement
    const order = [...c.set];
    if (form > 1700 && r.chance(0.3)) order.reverse();   // strong people sometimes start from the end
    for (const prob of order) {
      if (clock > c.plan.minutes * MIN - 3 * MIN) break;
      const solves = r.chance(solveChance(form, prob.rating, 95));
      const think = Math.max(3, (prob.rating - 600) / 45 * (1700 / Math.max(900, form)) * (0.6 + r.next() * 0.9)) * MIN;
      const lang = langFor(r, p);
      if (!solves) {
        // tried, did not get it: a couple of wrong submissions, then moved on or ran out of time
        if (prob.rating - form < 450 && r.chance(0.7)) {
          const tries = r.int(1, 3);
          for (let i = 0; i < tries && clock + think < c.plan.minutes * MIN; i++) {
            clock += think / (i + 1);
            subs.push(makeSub(r, u, prob, lang, wrongVerdict(r, lang), new Date(c.start.getTime() + clock), c._id));
          }
        }
        clock += think * 0.5;
        continue;
      }
      clock += think;
      if (clock >= c.plan.minutes * MIN) break;
      const wrong = wrongAttempts(r, form, prob.rating);
      for (let i = 0; i < wrong; i++) {
        subs.push(makeSub(r, u, prob, lang, wrongVerdict(r, lang), new Date(c.start.getTime() + clock), c._id));
        clock += r.int(2, 9) * MIN;
      }
      if (clock >= c.plan.minutes * MIN) break;
      const at = new Date(c.start.getTime() + clock);
      subs.push(makeSub(r, u, prob, lang, 'AC', at, c._id));
      solvedAt.set(`${u._id}:${prob.id}`, at.getTime());
      clock += r.int(1, 3) * MIN;
    }
  }
}

// practice: day by day from the day each person joined
for (const u of users) {
  const p = u.person;
  const r = rng(hash(p.username));
  for (let day = Math.floor(u.joined / DAY); day * DAY < NOW - DAY / 2; day++) {
    const date = new Date(day * DAY);
    const iso = date.toISOString().slice(0, 10);
    if (p.breaks?.some(([a, b]) => iso >= a && iso <= b)) continue;
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    if (!r.chance(Math.min(0.98, p.activity * (weekend ? p.weekendBoost : 1)))) continue;
    let clock = day * DAY + ((r.int(p.hours[0] * 60, p.hours[1] * 60 - 30) - p.tz * 60) * MIN);
    if (clock > NOW - 30 * MIN) continue;
    const sessions = p.activity > 0.9 ? 1 : r.int(1, weekend ? 3 : 2);
    for (let s = 0; s < sessions; s++) {
      // a problem someone has failed twice is one they have given up on
      const open = problems.filter((q) => !solvedAt.has(`${u._id}:${q.id}`) && (tries.get(`${u._id}:${q.id}`) ?? 0) < 2 && (reservedUntil.get(String(q.id)) ?? 0) < clock);
      if (open.length === 0) break;
      // people pick near their level, a little above when they are feeling brave
      const reach = open.filter((q) => q.rating - p.skill <= 300);
      const prob = r.weighted(reach.length && !r.chance(0.15) ? reach : open, (q) => Math.exp(-Math.abs(q.rating - (p.skill - 80 + r.normal() * 120)) / 220));
      // far above their level, most people read the statement and close the tab
      if (prob.rating - p.skill > 300 && !r.chance(0.2)) continue;
      const lang = langFor(r, p);
      const solves = r.chance(solveChance(p.skill, prob.rating, 100));
      const wrong = solves ? wrongAttempts(r, p.skill, prob.rating) : r.int(1, 3);
      if (!solves) tries.set(`${u._id}:${prob.id}`, (tries.get(`${u._id}:${prob.id}`) ?? 0) + 1);
      clock += r.int(8, 40) * MIN;
      for (let i = 0; i < wrong && clock < NOW; i++) {
        subs.push(makeSub(r, u, prob, lang, wrongVerdict(r, lang), new Date(clock), null));
        clock += r.int(3, 25) * MIN;
      }
      if (solves && clock < NOW) {
        subs.push(makeSub(r, u, prob, lang, 'AC', new Date(clock), null));
        solvedAt.set(`${u._id}:${prob.id}`, clock);
        // now and then the same idea in the other language, to compare
        // sometimes they tidy it up or make it faster and submit again
        if (r.chance(0.12)) subs.push(makeSub(r, u, prob, lang, 'AC', new Date(clock + r.int(6, 40) * MIN), null));
        if (p.otherLang && r.chance(0.08)) subs.push(makeSub(r, u, prob, lang === 'cpp17' ? 'python3' : 'cpp17', 'AC', new Date(clock + r.int(4, 15) * MIN), null));
      }
      clock += r.int(5, 30) * MIN;
    }
  }
}

// results, ranks and ratings, contest by contest, with the judge's own scoring
const ratings = new Map(users.map((u) => [String(u._id), 1400]));
const played = new Map<string, number>();
const history = new Map<string, unknown[]>(users.map((u) => [String(u._id), []]));
for (const c of contests) {
  const inRound = subs.filter((s) => s.contestId?.equals(c._id)).sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  const state = new Map<string, UserState>(users.map((u) => [String(u._id), { problems: {} }]));
  for (const s of inRound) state.set(String(s.userId), applyVerdict(state.get(String(s.userId))!, { problemId: String(s.problemId), status: s.status, submittedAt: s.submittedAt }, c.start));
  const rows = users.map((u) => ({ userId: String(u._id), ...score(state.get(String(u._id))!) }));
  const ranks = rank(rows);
  const deltas = ratingDeltas(ratings, ranks, played);
  for (const row of rows) {
    const next = ratings.get(row.userId)! + deltas.get(row.userId)!;
    ratings.set(row.userId, next);
    played.set(row.userId, (played.get(row.userId) ?? 0) + 1);
    history.get(row.userId)!.push({ contestId: c._id, title: c.plan.title, at: c.end, rank: ranks.get(row.userId)!, of: users.length, solved: row.solved, penalty: row.penalty, delta: deltas.get(row.userId)!, rating: next });
  }
}

// write
for (const u of users) {
  const id = String(u._id);
  const solved = new Set(subs.filter((s) => s.status === 'AC' && s.userId.equals(u._id)).map((s) => String(s.problemId))).size;
  Object.assign(u.doc, { rating: ratings.get(id), solvedCount: solved, ratingHistory: history.get(id) });
}
await UserModel.collection.insertMany(users.map((u) => ({ _id: u._id, ...u.doc })));
await ContestModel.collection.insertMany(contests.map((c) => ({
  _id: c._id, title: c.plan.title, startAt: c.start, endAt: c.end, scoring: 'icpc', aiMentorEnabled: false,
  problems: c.set.map((p, i) => ({ _id: new mongoose.Types.ObjectId(), problemId: p.id, points: 100 * (i + 1) })),
  participants: users.map((u) => u._id),
})));
subs.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
for (let i = 0; i < subs.length; i += 2000) await SubmissionModel.collection.insertMany(subs.slice(i, i + 2000));

// standings go through the same projection the live system uses
for (const c of contests) {
  await resetStandings(redis, String(c._id));
  for (const s of subs.filter((x) => x.contestId?.equals(c._id))) {
    await projectVerdict(redis, String(c._id), String(s.userId), `seed:${String(s._id)}`, { problemId: String(s.problemId), status: s.status, submittedAt: s.submittedAt }, c.start);
  }
}

const top = users.map((u) => ({ name: u.doc.username, rating: ratings.get(String(u._id))!, solved: u.doc.solvedCount as number })).sort((a, b) => b.rating - a.rating);
console.log(`${users.length} people, ${subs.length} submissions (${subs.filter((s) => s.contestId).length} in contests), ${contests.length} contests`);
for (const t of top) console.log(`  ${t.name.padEnd(16)} ${String(t.rating).padStart(5)}  ${t.solved} solved`);
redis.disconnect();
await disconnect();
