import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Segmented } from '../components/Segmented';
import { Empty, Icon } from '../components/Icon';

interface Item { id: string; slug: string; title: string; difficulty: 'easy' | 'medium' | 'hard'; tags: string[]; isPublic: boolean; solved: boolean }
interface Page { items: Item[]; nextCursor: string | null }

// the catalogue. everything the api can filter on is reachable from here:
// search, difficulty, a tag (click one). a solved problem says so, because
// "which ones have i done" is the first question on this page.
export function ProblemsPage() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);
  const difficulty = params.get('difficulty') ?? '';
  const tag = params.get('tag') ?? '';
  const q = params.get('q') ?? '';
  const cursor = params.get('cursor') ?? '';
  const [search, setSearch] = useState(q);

  const set = (next: Record<string, string>) => {
    const merged = { ...(difficulty ? { difficulty } : {}), ...(tag ? { tag } : {}), ...(q ? { q } : {}), ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v)));
  };
  // typing searches after a short pause; the url is the state, so a reload keeps it
  useEffect(() => { const t = setTimeout(() => { if (search !== q) set({ q: search, cursor: '' }); }, 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    setPage(null);
    const qs = new URLSearchParams({ limit: '25' });
    if (difficulty) qs.set('difficulty', difficulty);
    if (tag) qs.set('tag', tag);
    if (q) qs.set('q', q);
    if (cursor) qs.set('cursor', cursor);
    api<Page>('GET', `/api/problems?${qs}`).then(setPage).catch((e: Error) => setError(e.message));
  }, [difficulty, tag, q, cursor]);

  return (
    <div>
      <div className="row between wrap">
        <h1>Problems</h1>
        <div className="row wrap">
          <label className="searchbox"><Icon name="search" size={15} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles" aria-label="Search problems" /></label>
          <Segmented name="difficulty" value={difficulty} onChange={(v) => set({ difficulty: v, cursor: '' })}
            options={[{ value: '', label: 'All' }, { value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} />
        </div>
      </div>
      {tag && <p className="muted small filter-note">Tag: <span className="tagchip on">{tag}</span> <button className="link small" onClick={() => set({ tag: '', cursor: '' })}>Clear</button></p>}
      {error && <p className="error">{error}</p>}
      {!page && !error && <p className="muted">Loading…</p>}
      {page && page.items.length === 0 && <Empty icon="search" title={`Nothing matches${q ? ` “${q}”` : ''}`} hint="Try a shorter title, or clear the filters." />}
      {page && page.items.length > 0 && (
        <table className="list stagger">
          <thead><tr><th>Title</th><th>Difficulty</th><th>Tags</th></tr></thead>
          <tbody>
            {page.items.map((p) => (
              <tr key={p.id} className="clickable" onClick={() => nav(`/problems/${p.slug}`)}>
                <td>
                  <span className="row">
                    {p.solved && <span className="solved" title="Accepted"><Icon name="check-circle" size={16} /></span>}
                    <Link to={`/problems/${p.slug}`} onClick={(e) => e.stopPropagation()}>{p.title}</Link>
                    {!p.isPublic && <span className="pill">Draft</span>}
                  </span>
                </td>
                <td><span className={`diff ${p.difficulty}`}>{p.difficulty}</span></td>
                <td>
                  {p.tags.map((t) => (
                    <button key={t} className={`tagchip ${t === tag ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); set({ tag: t === tag ? '' : t, cursor: '' }); }}>{t}</button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {page?.nextCursor && (
        <p><button className="secondary" onClick={() => set({ cursor: page.nextCursor! })}>Next page</button></p>
      )}
    </div>
  );
}
