import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { usePageTitle } from '../components/PageHead';
import { useAuth } from '../lib/auth';
import { SiteFooter } from '../components/SiteFooter';
import { MentorShowcase } from '../components/MentorShowcase';

/** fades a section up the first time it scrolls into view. plain css does the motion; reduced motion turns it off there. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { el?.classList.add('in'); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}



// the hero's sample, tokenised the way vs code colours c++:
// ctl = control flow and preprocessor, kw = keywords and primitive types,
// ty = types and namespaces, fn = functions, v = variables, s = strings
type Tok = [string, string];
const CODE: Tok[][] = [
  [['ctl', '#include'], ['', ' '], ['s', '<bits/stdc++.h>']],
  [['kw', 'using'], ['', ' '], ['kw', 'namespace'], ['', ' '], ['ty', 'std'], ['', ';']],
  [],
  [['kw', 'int'], ['', ' '], ['fn', 'solve'], ['', '('], ['kw', 'const'], ['', ' '], ['ty', 'vector'], ['', '<'], ['kw', 'int'], ['', '>& '], ['v', 'a'], ['', ') {']],
  [['', '    '], ['ty', 'vector'], ['', '<'], ['kw', 'int'], ['', '> '], ['v', 'tails'], ['', ';']],
  [['', '    '], ['ctl', 'for'], ['', ' ('], ['kw', 'int'], ['', ' '], ['v', 'x'], ['', ' : '], ['v', 'a'], ['', ') {']],
  [['', '        '], ['kw', 'auto'], ['', ' '], ['v', 'it'], ['', ' = '], ['fn', 'lower_bound'], ['', '('], ['v', 'tails'], ['', '.'], ['fn', 'begin'], ['', '(), '], ['v', 'tails'], ['', '.'], ['fn', 'end'], ['', '(), '], ['v', 'x'], ['', ');']],
  [['', '        '], ['ctl', 'if'], ['', ' ('], ['v', 'it'], ['', ' == '], ['v', 'tails'], ['', '.'], ['fn', 'end'], ['', '()) '], ['v', 'tails'], ['', '.'], ['fn', 'push_back'], ['', '('], ['v', 'x'], ['', ');']],
  [['', '        '], ['ctl', 'else'], ['', ' *'], ['v', 'it'], ['', ' = '], ['v', 'x'], ['', ';']],
  [['', '    }']],
  [['', '    '], ['ctl', 'return'], ['', ' '], ['v', 'tails'], ['', '.'], ['fn', 'size'], ['', '();']],
  [['', '}']],
];

/** one stage of the judging path: a picture of it, then its name and one true fact */
function Stage({ n, title, note, area, dark, children }: { n: string; title: string; note: string; area: string; dark?: boolean; children: ReactNode }) {
  return (
    <article className={`stage st-${area}`}>
      <div className={`st-frame ${dark ? 'dark' : ''}`}><div className="st-media">{children}</div></div>
      <div className="st-cap"><span className="st-n">{n}</span><span className="st-title">{title}</span><span className="st-note">{note}</span></div>
    </article>
  );
}

export function LandingPage() {
  const { user } = useAuth();
  usePageTitle(undefined);
  const a = useReveal<HTMLElement>(); const b = useReveal<HTMLElement>(); const c = useReveal<HTMLElement>(); const d = useReveal<HTMLElement>();
  return (
    <div className="landing">
      <section className="l-hero grain">
        <div className="l-glow" aria-hidden="true" />
        <h1 className="l-title">Run your code.<br /><span className="l-grad">See the real verdict.</span></h1>
        <p className="l-sub">Programs run in an isolated sandbox with fixed time and memory limits. You see the exact test that failed, and a mentor reads the same run you did.</p>
        <div className="l-cta">
          <Link to={user ? '/problems' : '/register'} className="l-btn primary">{user ? 'Open problems' : 'Start solving'}</Link>
          <Link to="/problems" className="l-btn ghost">Browse problems <span aria-hidden="true">›</span></Link>
        </div>

        <div className="l-window" aria-hidden="true">
          <div className="l-bar"><i /><i /><i /><span>Longest increasing subsequence</span></div>
          <div className="l-body">
            <pre className="l-code">{CODE.map((line, n) => <span key={n} className="ln">{line.map(([k, t], m) => (k ? <span key={m} className={`t-${k}`}>{t}</span> : t))}{"\n"}</span>)}</pre>
            <div className="l-side">
              <div className="l-verdict"><span className="chip good">AC</span><b>Accepted</b><span className="muted">5 of 5 tests · 12 ms · 9 MB</span></div>
              <div className="l-bubble"><span className="l-dot" /> <b>Complexity auditor</b><p>Measured growth looks like n log n. The binary search is what keeps the loop from repeating work.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section ref={a} id="judging" className="l-section judging reveal">
        <header className="jg-head">
          <h2>What happens<br />when you submit</h2>
          <p>Every submission takes the same path. It is queued, compiled once, run test by test in a fresh container, judged on CPU time, and only then counted. Nothing is guessed.</p>
        </header>
        <div className="stages">
          <Stage n="01" title="Queued" note="p95 40 ms" area="queue">
            <div className="sv-queue"><span className="mono">POST /submit</span><b>202</b><span className="muted">Accepted. A worker takes it from here.</span></div>
          </Stage>
          <Stage n="02" title="Compiled once" note="g++ 13 · -O2" area="compile">
            <pre className="sv-log">{'$ g++ -O2 -std=c++17 \\\n    main.cpp -o main\n\n  compiled in 1.4 s\n  reused for all 8 tests'}</pre>
          </Stage>
          <Stage n="03" title="Run in a sandbox" note="cgroup limits" area="sandbox" dark>
            <p className="sv-lede">Untrusted code stays in a box: a fresh container per run, a read-only filesystem, hard memory limits.</p>
            <ul className="t-facts"><li><b>0</b><span>network</span></li><li><b>64</b><span>processes</span></li><li><b>1</b><span>pinned core</span></li></ul>
          </Stage>
          <Stage n="04" title="Judged" note="first failing test" area="verdict">
            <div className="t-chips"><span className="chip good">AC</span><span className="chip bad">WA</span><span className="chip tle">TLE</span><span className="chip tle">MLE</span><span className="chip bad">RE</span><span className="chip">CE</span></div>
            <p className="sv-line"><span className="chip bad">WA</span> Wrong answer on test case 6</p>
          </Stage>
          <Stage n="05" title="Counted" note="ICPC, live" area="board">
            <div className="t-board"><div><b>1</b> mei_lin <span>6 · 427</span></div><div><b>2</b> tomasz_nowak <span>6 · 440</span></div><div><b>3</b> kavya_s <span>6 · 720</span></div><div><b>4</b> lukas_weber <span>5 · 331</span></div></div>
          </Stage>
        </div>
      </section>

      <MentorShowcase />

      <div className="l-band grain">
      <section ref={b} className="l-statement reveal">
        <Icon name="check-circle" size={34} />
        <h2>The mentor never sees a hidden test.</h2>
        <p>It reads your code, the samples and what actually happened when your program ran. That is enough to be useful, and it is why it cannot hand you an answer.</p>
      </section>
      </div>

      <section ref={c} className="l-section l-langs reveal">
        <p className="t-kicker center">Languages</p>
        <div className="l-langrow"><span>C++17</span><span>C</span><span>Python 3</span><span>Java 17</span><span>JavaScript</span></div>
      </section>

      <section ref={d} className="l-final grain reveal">
        <h2>Submit your first solution.</h2>
        <p>Create an account, pick a problem, and the verdict usually arrives within seconds.</p>
        <Link to={user ? '/problems' : '/register'} className="l-btn primary big">{user ? 'Open problems' : 'Create an account'}</Link>
        {!user && <p className="small"><Link to="/login">Already have one? Sign in</Link></p>}
      </section>
      <SiteFooter />
    </div>
  );
}
