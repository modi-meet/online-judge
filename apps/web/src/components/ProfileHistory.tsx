import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LANGUAGE_SPEC, type Language } from '@oj/contracts';

export interface ContestRow { contestId: string; title: string; at: string; rank: number; of: number; solved: number; penalty: number; delta: number; rating: number }

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** a year of submissions, one square per day, weeks as columns. the newest week is on the right and in view. */
export function Heatmap({ days }: { days: { date: string; count: number }[] }) {
  const byDay = useMemo(() => new Map(days.map((d) => [d.date, d.count])), [days]);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = scroller.current; if (el) el.scrollLeft = el.scrollWidth; }, []);
  const today = Date.parse(iso(Date.now()));
  const start = today - (52 * 7 + new Date(today).getUTCDay()) * DAY;   // a sunday, 53 columns back
  const weeks: { t: number; n: number }[][] = [];
  for (let t = start; t <= today; t += DAY) {
    const w = Math.floor((t - start) / (7 * DAY));
    (weeks[w] ??= []).push({ t, n: byDay.get(iso(t)) ?? 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  const total = days.reduce((s, d) => s + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;
  return (
    <section className="ph-block">
      <div className="ph-head"><h3>Activity</h3><span className="muted small">{total} submissions on {activeDays} days in the last year</span></div>
      <div className="heat-scroll" ref={scroller}>
        <div className="heat" role="img" aria-label={`${total} submissions in the last year`}>
          <div className="heat-months">
            {weeks.map((w, i) => {
              const first = new Date(w[0]!.t);
              const show = i === 0 ? first.getUTCDate() <= 14 : first.getUTCDate() <= 7;
              return <span key={i}>{show ? MONTHS[first.getUTCMonth()] : ''}</span>;
            })}
          </div>
          <div className="heat-grid">
            {weeks.map((w, i) => (
              <div key={i} className="heat-col">
                {w.map((d) => <i key={d.t} className={`l${level(d.n)}`} title={`${d.n || 'No'} submission${d.n === 1 ? '' : 's'} on ${new Date(d.t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heat-legend muted small">Less <i className="l0" /><i className="l1" /><i className="l2" /><i className="l3" /><i className="l4" /> More</div>
    </section>
  );
}

/** rating after each contest. one line, one dot per contest, the latest labelled. */
export function RatingChart({ rows }: { rows: ContestRow[] }) {
  const pts = [...rows].reverse();
  if (pts.length === 0) return null;
  const W = 640; const H = 170; const pad = { l: 40, r: 56, t: 16, b: 26 };
  const vals = pts.map((p) => p.rating);
  const lo = Math.floor((Math.min(...vals, 1400) - 60) / 100) * 100;
  const hi = Math.ceil((Math.max(...vals, 1400) + 60) / 100) * 100;
  const x = (i: number) => pad.l + (pts.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (pts.length - 1));
  const y = (v: number) => pad.t + ((hi - v) * (H - pad.t - pad.b)) / (hi - lo);
  const ticks = [lo, Math.round((lo + hi) / 200) * 100, hi];
  const last = pts[pts.length - 1]!;
  return (
    <section className="ph-block">
      <div className="ph-head"><h3>Rating</h3><span className="muted small">{pts.length} rated contest{pts.length === 1 ? '' : 's'}</span></div>
      <svg className="rating-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rating ${last.rating} after ${pts.length} contests`}>
        {ticks.map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" /><text x={pad.l - 8} y={y(t) + 4} textAnchor="end">{t}</text></g>)}
        <polyline points={pts.map((p, i) => `${x(i)},${y(p.rating)}`).join(' ')} className="line" />
        {pts.map((p, i) => (
          <circle key={p.contestId} cx={x(i)} cy={y(p.rating)} r={i === pts.length - 1 ? 4.5 : 3} className={i === pts.length - 1 ? 'dot last' : 'dot'}>
            <title>{`${p.title}: ${p.rating} (${p.delta >= 0 ? '+' : ''}${p.delta}), rank ${p.rank} of ${p.of}`}</title>
          </circle>
        ))}
        <text x={x(pts.length - 1) + 10} y={y(last.rating) + 4} className="last-label">{last.rating}</text>
        {pts.map((p, i) => <text key={p.contestId} x={x(i)} y={H - 6} textAnchor="middle" className="xlabel">{new Date(p.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</text>)}
      </svg>
    </section>
  );
}

export function ContestHistory({ rows }: { rows: ContestRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="ph-block">
      <div className="ph-head"><h3>Contest history</h3></div>
      <table className="subs history"><thead><tr><th>Contest</th><th>Rank</th><th>Solved</th><th>Penalty</th><th>Change</th><th>Rating</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.contestId}>
              <td><Link to={`/contests/${r.contestId}`}>{r.title}</Link><div className="muted small">{new Date(r.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div></td>
              <td className="num"><b>{r.rank}</b><span className="muted"> / {r.of}</span></td>
              <td className="num">{r.solved}</td>
              <td className="num muted">{r.penalty}</td>
              <td className={`num ${r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : ''}`}>{r.delta > 0 ? '+' : ''}{r.delta}</td>
              <td className="num">{r.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function Breakdown({ byDifficulty, languages }: { byDifficulty: Record<'easy' | 'medium' | 'hard', number>; languages: { language: string; count: number }[] }) {
  const solved = byDifficulty.easy + byDifficulty.medium + byDifficulty.hard;
  const subs = languages.reduce((s, l) => s + l.count, 0);
  return (
    <section className="ph-block ph-split">
      <div>
        <div className="ph-head"><h3>Solved by difficulty</h3></div>
        {(['easy', 'medium', 'hard'] as const).map((d) => (
          <div key={d} className="bar-row">
            <span className={`diff ${d}`}>{d}</span>
            <span className="bar"><span className={`fill ${d}`} style={{ width: `${solved ? (byDifficulty[d] / solved) * 100 : 0}%` }} /></span>
            <span className="num">{byDifficulty[d]}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="ph-head"><h3>Languages</h3></div>
        {languages.map((l) => (
          <div key={l.language} className="bar-row">
            <span>{LANGUAGE_SPEC[l.language as Language]?.name ?? l.language}</span>
            <span className="bar"><span className="fill" style={{ width: `${subs ? (l.count / subs) * 100 : 0}%` }} /></span>
            <span className="num">{Math.round(subs ? (l.count / subs) * 100 : 0)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
