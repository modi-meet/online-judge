import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';

const REPO = 'https://github.com/modi-meet/online-judge';

type Item = { label: string; to?: string; href?: string };
type Group = { title: string; items: Item[] };

// the verdicts, quietest at the edges and accepted in the middle: the
// skyline at the foot of the page is the judge's own vocabulary
const SKYLINE = ['CE', 'RE', 'TLE', 'AC', 'MLE', 'WA', 'OLE'];
const HEIGHTS = [34, 52, 72, 100, 72, 52, 34];

function Tree({ group }: { group: Group }) {
  return (
    <div className="ft-group">
      <p className="ft-title">{group.title.toUpperCase()}/</p>
      <ul>
        {group.items.map((it) => (
          <li key={it.label}>
            <span className="ft-branch" aria-hidden="true">└──</span>
            {it.to ? <Link to={it.to}>{it.label}</Link> : <a href={it.href} target="_blank" rel="noreferrer">{it.label}</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const { user } = useAuth();
  const sky = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sky.current;
    if (!el || typeof IntersectionObserver === 'undefined') { el?.classList.add('in'); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cols: Group[][] = [
    [{ title: 'Practice', items: [
      { label: 'All problems', to: '/problems' },
      { label: 'Easy', to: '/problems?difficulty=easy' },
      { label: 'Medium', to: '/problems?difficulty=medium' },
      { label: 'Hard', to: '/problems?difficulty=hard' },
      { label: 'Arrays', to: '/problems?tag=arrays' },
      { label: 'Strings', to: '/problems?tag=strings' },
      { label: 'Graphs', to: '/problems?tag=graphs' },
      { label: 'Dynamic programming', to: '/problems?tag=dynamic-programming' },
      { label: 'Binary search', to: '/problems?tag=binary-search' },
      { label: 'Greedy', to: '/problems?tag=greedy' },
      { label: 'Number theory', to: '/problems?tag=number-theory' },
    ] }],
    [{ title: 'Contests', items: [
      { label: 'All rounds', to: '/contests' },
      { label: 'Weekly rounds', to: '/contests' },
      { label: 'ICPC scoring', href: `${REPO}/blob/main/docs/LLD.md` },
    ] }, { title: 'Mentor', items: [
      { label: 'Intuition engine', to: '/problems' },
      { label: 'Brainstorming partner', to: '/problems' },
      { label: 'Dry-run simulator', to: '/problems' },
      { label: 'Complexity auditor', to: '/problems' },
      { label: 'Conceptual translator', to: '/problems' },
      { label: 'Foundations architect', to: '/problems' },
    ] }],
    [{ title: 'Engine', items: [
      { label: 'Architecture', href: `${REPO}/blob/main/docs/hld.html` },
      { label: 'Low-level design', href: `${REPO}/blob/main/docs/LLD.md` },
      { label: 'Sandbox', href: `${REPO}/tree/main/packages/sandbox` },
      { label: 'Golden verdicts', href: `${REPO}/tree/main/packages/judge/test/golden` },
      { label: 'Load results', href: `${REPO}/blob/main/docs/load-results.md` },
      { label: 'Runbooks', href: `${REPO}/tree/main/docs/runbooks` },
      { label: 'Chaos drills', href: `${REPO}/tree/main/chaos` },
    ] }],
    [{ title: 'Account', items: user
      ? [{ label: 'Your profile', to: `/u/${user.username}` }, { label: 'Your problems', to: '/problems' }]
      : [{ label: 'Create an account', to: '/register' }, { label: 'Sign in', to: '/login' }],
    }, { title: 'About', items: [
      { label: 'Source code', href: REPO },
      { label: 'Project report', href: `${REPO}/blob/main/docs/report-2026-10-20.md` },
      { label: 'Languages', to: '/problems' },
    ] }],
  ];

  return (
    <footer className="site-footer">
      <div className="ft-inner">
        <Link to="/" className="ft-mark" aria-label="Online Judge home"><Icon name="code" size={22} /></Link>
        <div className="ft-cols">
          {cols.map((col, i) => <div key={i} className="ft-col">{col.map((g) => <Tree key={g.title} group={g} />)}</div>)}
        </div>
        <div className="ft-base">
          <a className="ft-social" href={REPO} target="_blank" rel="noreferrer" aria-label="Source code on GitHub">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg>
          </a>
          <p className="ft-copy">©2026 Online Judge. Built by Meet Modi. Every verdict comes from a real run.</p>
        </div>
      </div>
      <div className="ft-sky" ref={sky} aria-hidden="true">
        {SKYLINE.map((v, i) => (
          <div key={v} className="ft-bar" style={{ ['--h' as string]: `${HEIGHTS[i]}%`, ['--d' as string]: `${Math.abs(i - 3) * 70}ms` }}>
            <span className="ft-verdict">{v}</span>
            <span className="ft-fill grain" />
          </div>
        ))}
      </div>
    </footer>
  );
}
