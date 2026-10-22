import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { VerdictChip } from '../components/Verdict';
import { api } from '../lib/api';

interface Profile {
  user: { username: string; rating: number; solvedCount: number; joinedAt: string };
  stats: { total: number; accepted: number };
  recent: { id: string; slug: string | null; title: string; language: string; status: string; timeMs: number | null; submittedAt: string }[];
}

export function ProfilePage() {
  const { username } = useParams();
  const [p, setP] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Profile>('GET', `/api/users/${username}`).then(setP).catch((e: Error) => setError(e.message)); }, [username]);
  if (error) return <p className="error">{error}</p>;
  if (!p) return <p className="muted">loading…</p>;
  return (
    <div className="card" style={{ maxWidth: 760, margin: "24px auto" }}>
      <h1>{p.user.username}</h1>
      <dl className="stats">
        <div><dt>rating</dt><dd>{p.user.rating}</dd></div>
        <div><dt>solved</dt><dd>{p.user.solvedCount}</dd></div>
        <div><dt>submissions</dt><dd>{p.stats.total}</dd></div>
        <div><dt>accepted</dt><dd>{p.stats.accepted}</dd></div>
      </dl>
      <p className="muted">joined {new Date(p.user.joinedAt).toLocaleDateString()}</p>
      {p.recent.length > 0 && (
        <>
          <h3>recent submissions</h3>
          <table className="subs"><tbody>
            {p.recent.map((s) => (
              <tr key={s.id}>
                <td><VerdictChip status={s.status} /></td>
                <td>{s.slug ? <Link to={`/problems/${s.slug}`}>{s.title}</Link> : s.title}</td>
                <td className="mono muted">{s.language}</td>
                <td className="muted">{new Date(s.submittedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody></table>
        </>
      )}
    </div>
  );
}
