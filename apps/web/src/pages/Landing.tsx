import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { usePageTitle } from '../components/PageHead';
import { useAuth } from '../lib/auth';

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

const PERSONAS = ['Intuition engine', 'Brainstorming partner', 'Dry-run simulator', 'Complexity auditor', 'Conceptual translator', 'Foundations architect'];

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
            <pre className="l-code"><span className="c-k">#include</span> &lt;bits/stdc++.h&gt;{'\n'}<span className="c-k">using namespace</span> std;{'\n\n'}<span className="c-k">int</span> <span className="c-f">solve</span>(<span className="c-k">const</span> vector&lt;<span className="c-k">int</span>&gt;&amp; a) {'{'}{'\n'}    vector&lt;<span className="c-k">int</span>&gt; tails;{'\n'}    <span className="c-k">for</span> (<span className="c-k">int</span> x : a) {'{'}{'\n'}        <span className="c-k">auto</span> it = <span className="c-f">lower_bound</span>(tails.<span className="c-f">begin</span>(), tails.<span className="c-f">end</span>(), x);{'\n'}        <span className="c-k">if</span> (it == tails.<span className="c-f">end</span>()) tails.<span className="c-f">push_back</span>(x);{'\n'}        <span className="c-k">else</span> *it = x;{'\n'}    {'}'}{'\n'}    <span className="c-k">return</span> tails.<span className="c-f">size</span>();{'\n'}{'}'}</pre>
            <div className="l-side">
              <div className="l-verdict"><span className="chip good">AC</span><b>Accepted</b><span className="muted">5 of 5 tests · 12 ms · 9 MB</span></div>
              <div className="l-bubble"><span className="l-dot" /> <b>Complexity auditor</b><p>Measured growth looks like n log n. The binary search is what keeps the loop from repeating work.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section ref={a} className="l-section reveal">
        <h2 className="l-h2">What happens when you submit.</h2>
        <div className="bento">
          <article className="tile dark t-wide">
            <p className="t-kicker">Execution</p>
            <h3>Untrusted code stays in a box.</h3>
            <p>Every run is a fresh container with no network, a read-only filesystem, a process cap and hard memory limits. Time is measured on the CPU, never the wall clock.</p>
            <ul className="t-facts"><li><b>0</b><span>network</span></li><li><b>64</b><span>processes</span></li><li><b>1</b><span>pinned core</span></li></ul>
          </article>
          <article className="tile">
            <p className="t-kicker">Verdicts</p>
            <h3>Precise, never vague.</h3>
            <div className="t-chips"><span className="chip good">AC</span><span className="chip bad">WA</span><span className="chip tle">TLE</span><span className="chip tle">MLE</span><span className="chip bad">RE</span><span className="chip">CE</span></div>
            <p>You see which test failed first and why, with the compiler log or the stderr tail when it matters.</p>
          </article>
          <article className="tile">
            <p className="t-kicker">Contests</p>
            <h3>Live standings.</h3>
            <div className="t-board"><div><b>1</b> meet <span>2 · 31</span></div><div><b>2</b> ada <span>2 · 48</span></div><div><b>3</b> linus <span>1 · 12</span></div></div>
            <p>ICPC scoring with penalties, updated as verdicts land.</p>
          </article>
          <article className="tile t-wide tint">
            <p className="t-kicker">Mentor</p>
            <h3>Six personas. One that fits where you’re stuck.</h3>
            <div className="t-personas">{PERSONAS.map((p) => <span key={p}>{p}</span>)}</div>
          </article>
        </div>
      </section>

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
    </div>
  );
}
