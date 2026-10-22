import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { PageHead } from '../components/PageHead';
import { Empty } from '../components/Icon';

const when = (a: string, b: string) => {
  const s = new Date(a); const e = new Date(b);
  const day = s.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${t(s)} – ${t(e)}`;
};

export interface ContestSummary { id: string; title: string; startAt: string; endAt: string; phase: 'upcoming' | 'running' | 'ended'; problemCount: number; participantCount: number }

export function ContestsPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<ContestSummary[] | null>(null);
  useEffect(() => { api<{ items: ContestSummary[] }>('GET', '/api/contests').then((r) => setItems(r.items)); }, []);
  if (!items) return <p className="muted">Loading…</p>;
  const group = (ph: ContestSummary['phase']) => items.filter((c) => c.phase === ph);
  const Section = ({ title, rows }: { title: string; rows: ContestSummary[] }) => rows.length === 0 ? null : (
    <>
      <h3>{title}</h3>
      <table className="list stagger"><tbody>
        {rows.map((c) => (
          <tr key={c.id} className="clickable" onClick={() => nav(`/contests/${c.id}`)}>
            <td><Link to={`/contests/${c.id}`} onClick={(e) => e.stopPropagation()}>{c.title}</Link></td>
            <td className="muted">{when(c.startAt, c.endAt)}</td>
            <td className="muted">{c.problemCount} problems · {c.participantCount} registered</td>
          </tr>
        ))}
      </tbody></table>
    </>
  );
  return (
    <div>
      <PageHead title="Contests" lead="Timed rounds with a live scoreboard. Register before a round starts, then solve as many problems as you can; wrong attempts add a time penalty." />
      {items.length === 0 && <Empty icon="flag" title="No contests yet" hint="When one is scheduled, it shows up here." />}
      <Section title="Running" rows={group('running')} />
      <Section title="Upcoming" rows={group('upcoming')} />
      <Section title="Past" rows={group('ended')} />
    </div>
  );
}
