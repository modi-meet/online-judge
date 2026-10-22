import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { VerdictChip } from '../components/Verdict';
import { PageHead } from '../components/PageHead';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { UserAvatar, resizeToAvatar } from '../components/UserAvatar';

interface Profile {
  user: { username: string; displayName: string; bio: string; location: string; avatar: string; role: string; email?: string; rating: number; solvedCount: number; joinedAt: string };
  stats: { total: number; accepted: number };
  recent: { id: string; slug: string | null; title: string; language: string; status: string; timeMs: number | null; submittedAt: string }[];
}

export function ProfilePage() {
  const { username } = useParams();
  const [p, setP] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Profile>('GET', `/api/users/${username}`).then(setP).catch((e: Error) => setError(e.message)); }, [username]);
  const { user: me } = useAuth();
  const [editing, setEditing] = useState(false);
  if (error) return <p className="error">{error}</p>;
  if (!p) return <p className="muted">Loading…</p>;
  return (
    <div className="card" style={{ maxWidth: 760, margin: "24px auto" }}>
      <PageHead title={p.user.displayName || p.user.username} lead="Solving record and recent submissions." />
      <div className="profile-head">
        <UserAvatar username={p.user.username} name={p.user.displayName} src={p.user.avatar} size={84} />
        <div className="profile-meta">
          <div className="profile-name">@{p.user.username}{p.user.role !== 'user' && <span className="pill">{p.user.role}</span>}</div>
          <div className="muted">{p.user.displayName && <>{p.user.displayName}</>}{p.user.location && <>{p.user.displayName ? ' · ' : ''}{p.user.location}</>}</div>
          {p.user.email && <div className="muted">{p.user.email} <span className="pill">only you can see this</span></div>}
          {p.user.bio && <p className="profile-bio">{p.user.bio}</p>}
        </div>
        {me?.username === p.user.username && !editing && <button className="sm quiet" onClick={() => setEditing(true)}>Edit profile</button>}
      </div>
      {editing && <EditProfile p={p} onCancel={() => setEditing(false)} onSaved={(u) => { setP({ ...p, user: { ...p.user, ...u } }); setEditing(false); }} />}
      <dl className="stats">
        <div><dt>Rating</dt><dd>{p.user.rating}</dd></div>
        <div><dt>Solved</dt><dd>{p.user.solvedCount}</dd></div>
        <div><dt>Submissions</dt><dd>{p.stats.total}</dd></div>
        <div><dt>Accepted</dt><dd>{p.stats.accepted}</dd></div>
      </dl>
      <p className="muted">Joined {new Date(p.user.joinedAt).toLocaleDateString()}</p>
      {p.recent.length > 0 && (
        <>
          <h3>Recent submissions</h3>
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

type Editable = Pick<Profile['user'], 'displayName' | 'bio' | 'location' | 'avatar'>;

function EditProfile({ p, onCancel, onSaved }: { p: Profile; onCancel: () => void; onSaved: (u: Editable) => void }) {
  const [f, setF] = useState<Editable>({ displayName: p.user.displayName, bio: p.user.bio, location: p.user.location, avatar: p.user.avatar });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    try { setF({ ...f, avatar: await resizeToAvatar(file) }); setErr(null); } catch (e) { setErr((e as Error).message); }
  };
  const save = async () => {
    setBusy(true); setErr(null);
    try { const r = await api<{ user: Editable }>('PATCH', '/api/users/me', f); onSaved(r.user); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <form className="edit-profile" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="row">
        <UserAvatar username={p.user.username} name={f.displayName} src={f.avatar} size={64} />
        <label className="file-btn"><input type="file" accept="image/*" onChange={(e) => void pick(e.target.files?.[0])} hidden /><span className="btn-like sm secondary">Choose photo</span></label>
        {f.avatar && <button type="button" className="sm quiet" onClick={() => setF({ ...f, avatar: '' })}>Remove</button>}
      </div>
      <label>Name<input value={f.displayName} maxLength={60} onChange={(e) => setF({ ...f, displayName: e.target.value })} placeholder={p.user.username} /></label>
      <label>Location<input value={f.location} maxLength={60} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
      <label>About you<textarea value={f.bio} maxLength={280} rows={3} onChange={(e) => setF({ ...f, bio: e.target.value })} /></label>
      {err && <p className="error">{err}</p>}
      <div className="row"><button disabled={busy}>Save</button><button type="button" className="quiet" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}
