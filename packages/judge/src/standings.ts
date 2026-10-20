import { PENALISED, type Terminal } from '@oj/contracts';
import type { Redis } from 'ioredis';

// icpc scoring, stated once so nobody re-derives "penalty" differently. lld §9.1
//   per problem: solved iff any ac inside the window
//                penalty = minute of first ac + 20 * wrong attempts before it
//                (ce and ie are not wrong attempts)
//   per user:    zscore = solved * 1e9 - penalty   — one double, one ZREVRANGE

export const PENALTY_PER_WRONG = 20;

export interface ProblemState {
  solvedAt: number | null;   // minute from contest start
  wrongBefore: number;
}

export interface UserState {
  problems: Record<string, ProblemState>;
}

export interface VerdictEvent {
  problemId: string;
  status: Terminal;
  submittedAt: Date;
}

/** pure: applies one verdict to a user's state. returns the same object if nothing changed. */
export function applyVerdict(state: UserState, ev: VerdictEvent, contestStart: Date): UserState {
  const p = state.problems[ev.problemId] ?? { solvedAt: null, wrongBefore: 0 };
  if (p.solvedAt !== null) return state;                       // anything after the first ac changes nothing
  if (ev.status === 'AC') {
    const minute = Math.floor((ev.submittedAt.getTime() - contestStart.getTime()) / 60_000);
    return { problems: { ...state.problems, [ev.problemId]: { ...p, solvedAt: Math.max(0, minute) } } };
  }
  if (PENALISED.includes(ev.status)) {
    return { problems: { ...state.problems, [ev.problemId]: { ...p, wrongBefore: p.wrongBefore + 1 } } };
  }
  return state;
}

export function score(state: UserState) {
  let solved = 0;
  let penalty = 0;
  for (const p of Object.values(state.problems)) {
    if (p.solvedAt === null) continue;
    solved++;
    penalty += p.solvedAt + PENALTY_PER_WRONG * p.wrongBefore;
  }
  return { solved, penalty, zscore: solved * 1e9 - penalty };
}

// penalty is always far below 5e8, so rounding recovers the solved count exactly
export const unpack = (zscore: number) => {
  const solved = Math.round(zscore / 1e9);
  return { solved, penalty: solved * 1e9 - zscore };
};

const keyBoard = (c: string) => `contest:${c}:board`;
const keyUser = (c: string, u: string) => `contest:${c}:user:${u}`;
const keySeen = (c: string) => `contest:${c}:seen`;

/**
 * idempotent projection into redis. lld §9.2. a replay of the same eventId is
 * a no-op; a verdict that does not change the state does not touch the board.
 */
export async function projectVerdict(redis: Redis, contestId: string, userId: string, eventId: string, ev: VerdictEvent, contestStart: Date) {
  if ((await redis.sadd(keySeen(contestId), eventId)) === 0) return false;
  await redis.expire(keySeen(contestId), 172_800);
  const raw = await redis.hget(keyUser(contestId, userId), 'state');
  const before: UserState = raw ? (JSON.parse(raw) as UserState) : { problems: {} };
  const after = applyVerdict(before, ev, contestStart);
  if (after === before) return false;
  const s = score(after);
  await redis
    .multi()
    .hset(keyUser(contestId, userId), 'state', JSON.stringify(after))
    .zadd(keyBoard(contestId), s.zscore, userId)
    .exec();
  return true;
}

/** rebuild from scratch. the caller replays submissions in submittedAt order. */
export async function resetStandings(redis: Redis, contestId: string) {
  const users = await redis.keys(`${keyUser(contestId, '')}*`);
  await redis.del(keyBoard(contestId), keySeen(contestId), ...users);
}

export async function readStandings(redis: Redis, contestId: string, offset = 0, limit = 50) {
  const rows = await redis.zrevrange(keyBoard(contestId), offset, offset + limit - 1, 'WITHSCORES');
  const out: { userId: string; rank: number; solved: number; penalty: number; problems: Record<string, ProblemState> }[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const userId = rows[i]!;
    const { solved, penalty } = unpack(Number(rows[i + 1]));
    const raw = await redis.hget(keyUser(contestId, userId), 'state');
    out.push({ userId, rank: offset + i / 2 + 1, solved, penalty, problems: raw ? (JSON.parse(raw) as UserState).problems : {} });
  }
  return out;
}

export async function myRank(redis: Redis, contestId: string, userId: string) {
  const r = await redis.zrevrank(keyBoard(contestId), userId);
  return r === null ? null : r + 1;
}
