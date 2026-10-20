import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export interface ContestSummary { id: string; title: string; startAt: string; endAt: string; phase: 'upcoming' | 'running' | 'ended'; problemCount: number; participantCount: number }

export function ContestsPage() {
  const [items, setItems] = useState<ContestSummary[] | null>(null);
  useEffect(() => { api<{ items: ContestSummary[] }>('GET', '/api/contests').then((r) => setItems(r.items)); }, []);
  if (!items) return <p className="muted">loading…</p>;
  const group = (ph: ContestSummary['phase']) => items.filter((c) => c.phase === ph);
  const Section = ({ title, rows }: { title: string; rows: ContestSummary[] }) => rows.length === 0 ? null : (
    <>
      <h3>{title}</h3>
      <table className="list"><tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td><Link to={`/contests/${c.id}`}>{c.title}</Link></td>
            <td className="muted">{new Date(c.startAt).toLocaleString()} → {new Date(c.endAt).toLocaleTimeString()}</td>
            <td className="muted">{c.problemCount} problems · {c.participantCount} registered</td>
          </tr>
        ))}
      </tbody></table>
    </>
  );
  return (
    <div>
      <h1>contests</h1>
      {items.length === 0 && <p className="muted">no contests yet.</p>}
      <Section title="running" rows={group('running')} />
      <Section title="upcoming" rows={group('upcoming')} />
      <Section title="past" rows={group('ended')} />
    </div>
  );
}
