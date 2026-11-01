import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { spring, springSnappy } from '../lib/motion';

// one problem, six ways of being stuck on it. the same exchange a learner
// would have in the mentor dock, so the difference between personas is the
// point. it advances on its own until someone picks a persona.
interface Persona { id: number; name: string; stage: string; runs: boolean; ask: string; reply: string; trace?: string }
const PERSONAS: Persona[] = [
  { id: 1, name: 'Intuition engine', stage: 'I have no clue', runs: false,
    ask: 'I don’t even know where to start.',
    reply: 'Read the constraint first: n goes up to 2·10^5, so anything quadratic is out. Ask what a single pass would need to remember. For every length, keep the smallest value a subsequence of that length can end with.' },
  { id: 2, name: 'Brainstorming partner', stage: 'I have a clue and started', runs: false,
    ask: 'I keep a tails array, but my answer is too big on sample 2.',
    reply: 'Good instinct. Look at what happens when x equals a value already in tails. The subsequence is strictly increasing, so which search do you want: the first value ≥ x, or the first > x?' },
  { id: 3, name: 'Dry-run simulator', stage: 'I wrote an approach, not sure it’s right', runs: true,
    ask: 'Can you walk my code on sample 1?',
    trace: 'x=10  tails=[10]\nx=9   tails=[9]\nx=2   tails=[2]\nx=5   tails=[2, 5]\nx=3   tails=[2, 5, 3]   ← appended',
    reply: 'This is your program, run on the sample. Everything matches until x = 3: it should replace 5, not be appended.' },
  { id: 4, name: 'Complexity auditor', stage: 'Solved, but it times out', runs: true,
    ask: 'Accepted on small tests, TLE on test 6.',
    trace: 'n = 1 000     4 ms\nn = 10 000    310 ms\nn = 100 000   31 s      fit: n²',
    reply: 'Measured, not guessed: your time grows with n². The inner loop over j repeats work for every element. A binary search over tails brings it to n log n.' },
  { id: 5, name: 'Conceptual translator', stage: 'I don’t understand this data structure', runs: false,
    ask: 'Why does tails stay sorted?',
    reply: 'Think of piles of cards. Each new card goes on the leftmost pile whose top is not smaller. A pile’s top only ever gets smaller, so left to right the tops never decrease. The number of piles is your answer.' },
  { id: 6, name: 'Foundations architect', stage: 'I’m new to this data structure', runs: false,
    ask: 'I’ve never used binary search on my own array.',
    reply: 'Start with the primitive: the first position whose value is not less than x. Then three problems in order: First occurrence in a sorted array, Search in a rotated sorted array, then come back to this one.' },
];

export function MentorShowcase() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  // a short "thinking" beat before each reply, so the exchange reads as one
  const [thinking, setThinking] = useState(false);
  useEffect(() => { setThinking(true); const t = setTimeout(() => setThinking(false), reduce ? 0 : 900); return () => clearTimeout(t); }, [active, reduce]);
  useEffect(() => {
    if (!auto || !inView) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % PERSONAS.length), 6500);
    return () => clearTimeout(t);
  }, [auto, inView, active]);
  const p = PERSONAS[active]!;

  return (
    <section ref={ref} className="l-section mentor-show">
      <p className="t-kicker center">Mentor</p>
      <h2 className="l-h2">Six mentors.<br /><span className="muted">Pick where you’re stuck.</span></h2>
      <div className="ms-grid">
        <div className="ms-list" role="tablist" aria-label="Where are you stuck?">
          {PERSONAS.map((x, i) => (
            <button key={x.id} role="tab" aria-selected={i === active} className={`ms-item ${i === active ? 'on' : ''}`}
              onClick={() => { setAuto(false); setActive(i); }}>
              {i === active && <motion.span layoutId="ms-thumb" className="ms-thumb" transition={reduce ? { duration: 0 } : springSnappy} />}
              <span className="ms-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="ms-text"><span className="ms-stage">{x.stage}</span><span className="ms-name">{x.name}</span></span>
              {i === active && auto && inView && !reduce && <motion.span key={`p${active}`} className="ms-progress" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 6.5, ease: 'linear' }} />}
            </button>
          ))}
        </div>

        <div className="ms-panel" role="tabpanel" aria-live="polite">
          <p className="ms-day">Longest increasing subsequence</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={p.id} className="ms-thread" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <motion.div className="ms-row me" initial={reduce ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={reduce ? { duration: 0 } : spring}>
                <p className="ms-bubble">{p.ask}</p>
                <span className="ms-meta">You · just now</span>
              </motion.div>
              <motion.div className="ms-row them" initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={reduce ? { duration: 0 } : { ...spring, delay: 0.12 }}>
                <span className="ms-meta"><span className="l-dot" />{p.name} · {p.runs ? 'ran your code' : 'read your code'}</span>
                <div className="ms-bubble">
                  <AnimatePresence mode="wait" initial={false}>
                    {thinking ? (
                      <motion.span key="status" className="ms-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>{p.runs ? 'Running your code on the samples' : 'Reading your code'}</motion.span>
                    ) : (
                      <motion.div key="reply" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
                        {p.trace && <pre className="ms-trace">{p.trace}</pre>}
                        <p className="ms-reply">{p.reply}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
          <Link to="/problems" className="ms-composer">
            <span>Ask the {p.name.toLowerCase()} on a real problem</span>
            <span className="ms-send" aria-hidden="true">↑</span>
          </Link>
        </div>
      </div>
      <p className="ms-note muted small">Sample exchanges. The real mentor reads your code, the samples and the run, and never a hidden test.</p>
    </section>
  );
}
