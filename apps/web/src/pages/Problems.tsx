import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Segmented } from '../components/Segmented';

interface Item { id: string; slug: string; title: string; difficulty: 'easy' | 'medium' | 'hard'; tags: string[]; isPublic: boolean }
interface Page { items: Item[]; nextCursor: string | null }

export function ProblemsPage() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);
  const difficulty = params.get('difficulty') ?? '';
  const cursor = params.get('cursor') ?? '';

  useEffect(() => {
    setPage(null);
    const qs = new URLSearchParams({ limit: '25' });
    if (difficulty) qs.set('difficulty', difficulty);
    if (cursor) qs.set('cursor', cursor);
    api<Page>('GET', `/api/problems?${qs}`).then(setPage).catch((e: Error) => setError(e.message));
  }, [difficulty, cursor]);

  return (
    <div>
      <div className="row between">
        <h1>problems</h1>
        <Segmented name="difficulty" value={difficulty} onChange={(v) => setParams(v ? { difficulty: v } : {})}
          options={[{ value: '', label: 'all' }, { value: 'easy', label: 'easy' }, { value: 'medium', label: 'medium' }, { value: 'hard', label: 'hard' }]} />
      </div>
      {error && <p className="error">{error}</p>}
      {!page && !error && <p className="muted">loading…</p>}
      {page && page.items.length === 0 && <p className="muted">nothing here yet.</p>}
      {page && page.items.length > 0 && (
        <table className="list">
          <thead><tr><th>title</th><th>difficulty</th><th>tags</th></tr></thead>
          <tbody>
            {page.items.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/problems/${p.slug}`}>{p.title}</Link>{!p.isPublic && <span className="pill">draft</span>}</td>
                <td><span className={`diff ${p.difficulty}`}>{p.difficulty}</span></td>
                <td className="muted">{p.tags.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {page?.nextCursor && (
        <p><button className="secondary" onClick={() => setParams({ ...(difficulty ? { difficulty } : {}), cursor: page.nextCursor! })}>next page</button></p>
      )}
    </div>
  );
}
