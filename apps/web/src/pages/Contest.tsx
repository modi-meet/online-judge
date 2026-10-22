import { useCallback, useEffect, useState } from 'react';
import { useStandings, type Row } from '../lib/useStandings';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { ContestSummary } from './Contests';

interface Detail {
  contest: ContestSummary & { registered: boolean; scoring: string };
  problems: { letter: string; problemId: string; points: number; slug: string | null; title: string | null; difficulty: string | null }[];
}
interface Board {
  total: number; me: number | null;
  items: { rank: number; username: string; solved: number; penalty: number; problems: Record<string, { solvedAt: number | null; wrongBefore: number }> }[];
}

const countdown = (to: string) => {
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return '0:00';
  const m = Math.floor(ms / 60_000); const s = Math.floor((ms % 60_000) / 1000);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export function ContestPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [d, setD] = useState<Detail | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const r = await api<Detail>('GET', `/api/contests/${id}`); setD(r);
    if (r.contest.phase !== 'upcoming') setBoard(await api<Board>('GET', `/api/contests/${id}/leaderboard`));
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  // live standings: websocket snapshot + deltas, polling only as the fallback
  const letters = Object.fromEntries((d?.problems ?? []).map((p) => [p.problemId, p.letter]));
  const pollBoard = useCallback(async () => {
    const b = await api<Board>('GET', `/api/contests/${id}/leaderboard`);
    return b.items.map((r) => ({ userId: r.username, username: r.username, rank: r.rank, solved: r.solved, penalty: r.penalty, problems: Object.fromEntries(Object.entries(r.problems).map(([L, st]) => [Object.keys(letters).find((k) => letters[k] === L) ?? L, st])) })) as Row[];
  }, [id, d?.problems?.length]);
  const standings = useStandings(id, !!d && d.contest.phase !== 'upcoming' && !!user, pollBoard);
  const rows = standings.rows ?? board?.items.map((r) => ({ userId: r.username, username: r.username, rank: r.rank, solved: r.solved, penalty: r.penalty, problems: Object.fromEntries(Object.entries(r.problems).map(([L, st]) => [Object.keys(letters).find((k) => letters[k] === L) ?? L, st])) })) ?? null;

  if (!d) return <p className="muted">Loading…</p>;
  const { contest, problems } = d;
  const register = async () => { await api('POST', `/api/contests/${id}/register`); await load(); };

  return (
    <div>
      <Link to="/contests" className="muted">← Contests</Link>
      <div className="row between wrap">
        <div>
          <h1>{contest.title}</h1>
          <p className="muted">
            {contest.phase === 'upcoming' && <>Starts in <span className="mono">{countdown(contest.startAt)}</span></>}
            {contest.phase === 'running' && <>Ends in <span className="mono">{countdown(contest.endAt)}</span></>}
            {contest.phase === 'ended' && <>Ended {new Date(contest.endAt).toLocaleString()}</>}
            {' · '}{contest.participantCount} registered · {contest.scoring}
          </p>
        </div>
        {!user && contest.phase !== 'ended' && <Link to="/login" state={{ from: `/contests/${id}` }}><button className="secondary">Sign in to register</button></Link>}
        {user && !contest.registered && contest.phase !== 'ended' && <button onClick={() => void register()}>Register</button>}
        {contest.registered && <span className="chip good">Registered</span>}
      </div>

      <h3>Problems</h3>
      {contest.phase === 'upcoming' ? <p className="muted">{contest.problemCount} problems, Revealed at the start.</p> : (
        <table className="list"><tbody>
          {problems.map((p) => (
            <tr key={p.problemId}>
              <td className="mono">{p.letter}</td>
              <td>{p.slug ? <Link to={contest.phase === 'running' ? `/problems/${p.slug}?contest=${id}` : `/problems/${p.slug}`}>{p.title}</Link> : p.title}</td>
              <td><span className={`diff ${p.difficulty}`}>{p.difficulty}</span></td>
              <td className="muted">{p.points} pts</td>
            </tr>
          ))}
        </tbody></table>
      )}

      {rows && (
        <>
          <h3>Standings{board?.me ? <span className="muted"> · You are #{board.me}</span> : null}{standings.live && <span className="chip good" style={{ marginLeft: 8 }}>Live</span>}</h3>
          {rows.length === 0 ? <p className="muted">No accepted solutions yet.</p> : (
            <table className="list board">
              <thead><tr><th>#</th><th>Who</th><th>Solved</th><th>Penalty</th>{problems.map((p) => <th key={p.letter}>{p.letter}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.userId} className={r.username === user?.username ? 'sel' : ''}>
                    <td className="mono">{r.rank}</td>
                    <td><Link to={`/u/${r.username}`}>{r.username}</Link></td>
                    <td className="mono">{r.solved}</td>
                    <td className="mono">{r.penalty}</td>
                    {problems.map((p) => {
                      const st = r.problems[p.problemId];
                      return <td key={p.letter} className={`mono cell ${st?.solvedAt !== null && st?.solvedAt !== undefined ? 'good' : st?.wrongBefore ? 'bad' : ''}`}>
                        {st?.solvedAt !== null && st?.solvedAt !== undefined ? `+${st.wrongBefore || ''}` : st?.wrongBefore ? `-${st.wrongBefore}` : ''}
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
