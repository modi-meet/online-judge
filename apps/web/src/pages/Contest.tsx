import { useCallback, useEffect, useState } from 'react';
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
  // v1 polls; websocket push is v2 (lld §10.2)
  useEffect(() => {
    const t = setInterval(() => { setTick((x) => x + 1); if (d?.contest.phase === 'running' && tick % 5 === 4) void load(); }, 1000);
    return () => clearInterval(t);
  }, [d?.contest.phase, tick, load]);

  if (!d) return <p className="muted">loading…</p>;
  const { contest, problems } = d;
  const register = async () => { await api('POST', `/api/contests/${id}/register`); await load(); };

  return (
    <div>
      <div className="row between">
        <div>
          <h1>{contest.title}</h1>
          <p className="muted">
            {contest.phase === 'upcoming' && <>starts in <span className="mono">{countdown(contest.startAt)}</span></>}
            {contest.phase === 'running' && <>ends in <span className="mono">{countdown(contest.endAt)}</span></>}
            {contest.phase === 'ended' && <>ended {new Date(contest.endAt).toLocaleString()}</>}
            {' · '}{contest.participantCount} registered · {contest.scoring}
          </p>
        </div>
        {user && !contest.registered && contest.phase !== 'ended' && <button onClick={() => void register()}>register</button>}
        {contest.registered && <span className="chip good">registered</span>}
      </div>

      <h3>problems</h3>
      {contest.phase === 'upcoming' ? <p className="muted">{contest.problemCount} problems, revealed at the start.</p> : (
        <table className="list"><tbody>
          {problems.map((p) => (
            <tr key={p.problemId}>
              <td className="mono">{p.letter}</td>
              <td>{p.slug ? <Link to={`/problems/${p.slug}?contest=${id}`}>{p.title}</Link> : p.title}</td>
              <td><span className={`diff ${p.difficulty}`}>{p.difficulty}</span></td>
              <td className="muted">{p.points} pts</td>
            </tr>
          ))}
        </tbody></table>
      )}

      {board && (
        <>
          <h3>standings{board.me ? <span className="muted"> · you are #{board.me}</span> : null}</h3>
          {board.items.length === 0 ? <p className="muted">no accepted solutions yet.</p> : (
            <table className="list board">
              <thead><tr><th>#</th><th>who</th><th>solved</th><th>penalty</th>{problems.map((p) => <th key={p.letter}>{p.letter}</th>)}</tr></thead>
              <tbody>
                {board.items.map((r) => (
                  <tr key={r.username} className={r.username === user?.username ? 'sel' : ''}>
                    <td className="mono">{r.rank}</td>
                    <td><Link to={`/u/${r.username}`}>{r.username}</Link></td>
                    <td className="mono">{r.solved}</td>
                    <td className="mono">{r.penalty}</td>
                    {problems.map((p) => {
                      const st = r.problems[p.letter];
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
