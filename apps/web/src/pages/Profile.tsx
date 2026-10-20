import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

interface Profile { user: { username: string; rating: number; solvedCount: number; joinedAt: string }; stats: { total: number; accepted: number } }

export function ProfilePage() {
  const { username } = useParams();
  const [p, setP] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Profile>('GET', `/api/users/${username}`).then(setP).catch((e: Error) => setError(e.message)); }, [username]);
  if (error) return <p className="error">{error}</p>;
  if (!p) return <p className="muted">loading…</p>;
  return (
    <div className="card narrow">
      <h1>{p.user.username}</h1>
      <dl className="stats">
        <div><dt>rating</dt><dd>{p.user.rating}</dd></div>
        <div><dt>solved</dt><dd>{p.user.solvedCount}</dd></div>
        <div><dt>submissions</dt><dd>{p.stats.total}</dd></div>
        <div><dt>accepted</dt><dd>{p.stats.accepted}</dd></div>
      </dl>
      <p className="muted">joined {new Date(p.user.joinedAt).toLocaleDateString()}</p>
    </div>
  );
}
