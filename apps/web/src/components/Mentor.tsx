import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useMentor, type ModeInfo } from '../lib/useMentor';
import { springSnappy, useEnter } from '../lib/motion';

// the mentor is a dock, not a tab. a launcher sits bottom right on every
// tab of the problem page, because "i am stuck" can happen while you run,
// while you read a verdict, or while you read the statement. the panel opens
// from the launcher (transform-origin at its corner), closes faster than it
// opens, and stays mounted so each persona's thread survives being closed.

const BLURB: Record<number, string> = {
  1: 'No clue where to start',
  2: 'Have an idea, started coding',
  3: 'Written it, not sure it is right',
  4: 'Correct but too slow',
  5: 'What even is this data structure',
  6: 'New to it, teach me from zero',
};
const OPENER: Record<number, string> = {
  1: 'Start with the problem as it is: which family does this belong to, and why?',
  2: 'Look at my code so far and find the one gap that matters most.',
  3: 'Run my code on the sample and walk me through what actually happens.',
  4: 'Time my code and tell me what is making it slow.',
  5: 'Explain the idea behind this problem without any code.',
  6: 'Teach me the data structure this needs, from zero, and tell me what to practise.',
};

export function MentorDock(p: { problemId: string; language: string; code: string; contestId: string | null; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [modes, setModes] = useState<ModeInfo[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<number>(1);
  const [draft, setDraft] = useState('');
  const m = useMentor();
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const arrive = useEnter(8);

  useEffect(() => {
    fetch('/api/ai/modes').then((r) => r.json()).then((j: { enabled: boolean; modes: ModeInfo[] }) => { setEnabled(j.enabled); setModes(j.modes); }).catch(() => setEnabled(false));
  }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [m.turns]);
  // keyboard: escape closes; opening focuses the box (no animation gating on either)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus(), 30);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => { clearTimeout(t); window.removeEventListener('keydown', esc); };
  }, [open]);

  if (!enabled || !modes) return null;
  const persona = modes.find((x) => x.id === mode)!;
  const started = m.conversationId !== null || m.turns.length > 0;

  const pick = (id: number) => { if (id === mode) return; m.switchTo(mode, id); setMode(id); setDraft(''); };
  const submit = () => {
    if (m.busy) return;
    const text = draft;
    setDraft('');
    void m.send({ problemId: p.problemId, mode, language: p.language, code: p.code, contestId: p.contestId }, text);
  };

  return (
    <>
      <button className={`dock-launch ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mentor-panel">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.5 4 4 1.5-4 1.5L8 12.5 6.5 8.5l-4-1.5 4-1.5z" fill="currentColor" /></svg>
        <span>{open ? 'Close' : 'Ask the mentor'}</span>
        {!open && m.busy && <span className="dock-dot" aria-label="Mentor is replying" />}
      </button>

      <section id="mentor-panel" className="dock-panel" data-open={open} aria-hidden={!open} aria-label="Mentor">
        <header className="dock-head">
          <div>
            <strong>Mentor</strong>
            <div className="muted small">{persona.name} · {persona.needsExecution ? 'Runs your code in the sandbox first' : 'Reads the statement' + (mode === 2 ? ' and your code' : '')}</div>
          </div>
          <div className="row">
            {started && <button className="link small" onClick={() => { m.clear(mode); setDraft(''); }}>New conversation</button>}
          </div>
        </header>

        <div className="personas" role="tablist" aria-label="Mentor persona">
          {modes.map((x) => (
            <button key={x.id} role="tab" aria-selected={mode === x.id} className={`persona ${mode === x.id ? 'on' : ''}`} onPointerDown={() => !m.busy && pick(x.id)} onClick={() => pick(x.id)} disabled={m.busy} title={BLURB[x.id]}>
              {mode === x.id && <motion.span layoutId="persona-ring" className="ring" transition={springSnappy} />}
              <span className="persona-label">{x.name}</span>
            </button>
          ))}
        </div>

        <div className="chat-log" ref={log}>
          {!started && (
            <div className="opener">
              <p><strong>{persona.name}</strong></p>
              <p className="muted small">{BLURB[mode]}. Send a message, or just press Ask and it opens with:</p>
              <p className="small quote">“{OPENER[mode]}”</p>
            </div>
          )}
          {m.turns.map((t, i) => (
            <motion.div key={i} className={`bubble ${t.role} ${t.blocked ? 'blocked' : ''}`} initial={arrive.initial} animate={arrive.animate} transition={arrive.transition} layout="position">
              {t.cached && <span className="tag">Cached</span>}
              {t.blocked && <span className="tag bad">Leak guard</span>}
              {t.role === 'assistant' && !t.text && m.busy ? <span className="muted">{m.status ?? 'Thinking…'}</span> : <Reply text={t.text} />}
              {t.role === 'assistant' && t.text && m.busy && i === m.turns.length - 1 && <span className="cursor">▍</span>}
            </motion.div>
          ))}
        </div>

        {m.error && <p className="error small dock-error">{m.error}</p>}
        <form className="chat-input row" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={p.signedIn ? (started ? `Reply to ${persona.name.toLowerCase()}…` : 'Ask, or leave empty for the opening question') : 'Sign in to talk to the mentor'}
            disabled={!p.signedIn || m.busy}
            maxLength={4000}
          />
          {m.busy
            ? <button type="button" className="secondary" onClick={m.stop}>Stop</button>
            : <button type="submit" disabled={!p.signedIn || (started && !draft.trim())}>{started ? 'Send' : 'Ask'}</button>}
        </form>
        {m.remaining !== null && !m.busy && <p className="muted small dock-foot">{m.remaining.toLocaleString()} tokens left today</p>}
      </section>
    </>
  );
}

/** prose plus fenced code, nothing fancier. the mentor is told to keep it short. */
function Reply({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```|```[\s\S]*$)/);
  return (
    <>
      {parts.map((s, i) => s.startsWith('```')
        ? <pre key={i} className="out">{s.replace(/^```\w*\n?/, '').replace(/```$/, '')}</pre>
        : s.trim() ? <p key={i} className="prose">{s}</p> : null)}
    </>
  );
}
