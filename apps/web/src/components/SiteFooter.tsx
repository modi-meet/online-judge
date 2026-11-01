import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';

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
            {it.to ? <Link to={it.to}>{it.label}</Link> : <a href={it.href}>{it.label}</a>}
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
    ] }, { title: 'Mentor', items: [
      { label: 'Intuition engine', to: '/problems' },
      { label: 'Brainstorming partner', to: '/problems' },
      { label: 'Dry-run simulator', to: '/problems' },
      { label: 'Complexity auditor', to: '/problems' },
      { label: 'Conceptual translator', to: '/problems' },
      { label: 'Foundations architect', to: '/problems' },
    ] }],
    [{ title: 'Account', items: user
      ? [{ label: 'Your profile', to: `/u/${user.username}` }, { label: 'Your problems', to: '/problems' }]
      : [{ label: 'Create an account', to: '/register' }, { label: 'Sign in', to: '/login' }],
    }, { title: 'About', items: [
      { label: 'Home', to: '/' },
      { label: 'How judging works', href: '#judging' },
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
