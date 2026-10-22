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

const SUGGEST: Record<number, string[]> = {
  1: ['Which pattern fits the constraints?', 'What edge cases should I watch for?'],
  2: ['Is my approach on the right track?', 'What is the weakest part of my code?'],
  3: ['Where does my code first go wrong?', 'Why does the sample behave this way?'],
  4: ['What is the time complexity of my code?', 'Which part is the bottleneck?'],
  5: ['Explain it with an analogy', 'What invariant does it keep?'],
  6: ['Teach me the data structure', 'Which problems should I practise next?'],
};

export const WIDE = '(min-width: 1180px)';

export function MentorDock(p: { problemId: string; language: string; code: string; contestId: string | null; signedIn: boolean; open: boolean; setOpen: (v: boolean | ((o: boolean) => boolean)) => void }) {
  const { open, setOpen } = p;
  const [modes, setModes] = useState<ModeInfo[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<number>(1);
  const [draft, setDraft] = useState('');
  const m = useMentor();
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const arrive = useEnter(8);

  useEffect(() => {
    fetch('/api/ai/modes').then((r) => r.json()).then((j: { enabled: boolean; modes: ModeInfo[] }) => { setEnabled(j.enabled); setModes(j.modes); }).catch(() => setEnabled(false));
  }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [m.turns]);
  // keyboard: escape closes; opening focuses the box (no animation gating on either)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus(), 30);
    // on a wide screen the mentor is a column, not an overlay: escape is not its to take
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !window.matchMedia(WIDE).matches) setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => { clearTimeout(t); window.removeEventListener('keydown', esc); };
  }, [open]);

  if (!enabled || !modes) return null;
  const persona = modes.find((x) => x.id === mode)!;
  const started = m.conversationId !== null || m.turns.length > 0;

  const pick = (id: number) => { if (id === mode) return; m.switchTo(mode, id); setMode(id); setDraft(''); };
  const sees = persona.needsExecution ? ['Statement', 'Your code', 'Runs it on sample 1'] : mode === 2 ? ['Statement', 'Your code', 'Recent verdicts'] : mode === 6 ? ['Statement', 'Related problems'] : ['Statement'];
  const send = (text: string) => { if (m.busy) return; setDraft(''); void m.send({ problemId: p.problemId, mode, language: p.language, code: p.code, contestId: p.contestId }, text); };
  const grow = (el: HTMLTextAreaElement) => { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px`; };

  return (
    <>
      <button className={`dock-launch ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mentor-panel">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.5 4 4 1.5-4 1.5L8 12.5 6.5 8.5l-4-1.5 4-1.5z" fill="currentColor" /></svg>
        <span>{open ? 'Close' : 'Ask the mentor'}</span>
        {!open && m.busy && <span className="dock-dot" aria-label="Mentor is replying" />}
      </button>

      <section id="mentor-panel" className="dock-panel" data-open={open} aria-hidden={!open} aria-label="Mentor">
        <header className="dock-head">
          <div className="row">
            <Avatar mode={mode} />
            <div>
              <strong className="dock-title">{persona.name}</strong>
              <div className="muted small">{BLURB[mode]}</div>
            </div>
          </div>
          <div className="row">
            {started && <button className="link small" onClick={() => { m.clear(mode); setDraft(''); }}>New chat</button>}
            <button className="link small wide-only" onClick={() => setOpen(false)} aria-label="Hide the mentor">Hide</button>
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
            <div className="empty">
              <Avatar mode={mode} size={44} />
              <h2>{persona.name}</h2>
              <p className="muted">{BLURB[mode]}.</p>
              <div className="sees" aria-label="What the mentor sees">
                {sees.map((x) => <span key={x} className="see">{x}</span>)}
              </div>
              <button className="primary-wide" onClick={() => send('')} disabled={!p.signedIn || m.busy}>{p.signedIn ? 'Start' : 'Sign in to start'}</button>
              <p className="faint small opens">Opens with “{OPENER[mode]}”</p>
              {p.signedIn && (
                <div className="suggest">
                  {SUGGEST[mode]!.map((q) => <button key={q} className="suggest-chip" onClick={() => send(q)} disabled={m.busy}>{q}</button>)}
                </div>
              )}
            </div>
          )}
          {m.turns.map((t, i) => {
            const last = i === m.turns.length - 1;
            return (
              <motion.div key={i} className={`msg ${t.role} ${t.blocked ? 'blocked' : ''}`} initial={arrive.initial} animate={arrive.animate} transition={arrive.transition} layout="position">
                {t.role === 'assistant' && <Avatar mode={mode} size={24} />}
                <div className="msg-body">
                  {(t.cached || t.blocked) && <div className="msg-tags">{t.cached && <span className="tag">Cached</span>}{t.blocked && <span className="tag bad">Stopped by the leak guard</span>}</div>}
                  {t.role === 'assistant' && !t.text && m.busy
                    ? <div className="typing" aria-label={m.status ?? 'Thinking'}><i /><i /><i />{m.status && <span className="muted small">{m.status}</span>}</div>
                    : <Reply text={t.text} />}
                  {t.role === 'assistant' && t.text && m.busy && last && <span className="cursor">▍</span>}
                </div>
              </motion.div>
            );
          })}
        </div>

        {m.error && <p className="error small dock-error">{m.error}</p>}
        <form className="composer" onSubmit={(e) => { e.preventDefault(); if (draft.trim() || !started) send(draft); }}>
          <textarea
            ref={input}
            rows={1}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); grow(e.target); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (draft.trim()) { send(draft); } } }}
            placeholder={p.signedIn ? (started ? `Reply to ${persona.name.toLowerCase()}…` : 'Ask anything about this problem') : 'Sign in to talk to the mentor'}
            disabled={!p.signedIn || m.busy}
            maxLength={4000}
          />
          {m.busy
            ? <button type="button" className="send stop" onClick={m.stop} aria-label="Stop"><svg width="12" height="12" viewBox="0 0 12 12"><rect width="12" height="12" rx="2.5" fill="currentColor" /></svg></button>
            : <button type="submit" className="send" disabled={!p.signedIn || !draft.trim()} aria-label="Send"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 12V2M7 2L3 6M7 2l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg></button>}
        </form>
        <p className="faint small dock-foot">{m.remaining !== null && !m.busy ? `${m.remaining.toLocaleString()} tokens left today · ` : ''}Enter to send, Shift+Enter for a new line</p>
      </section>
    </>
  );
}

const HUE: Record<number, string> = { 1: '#ff9f0a', 2: '#0a84ff', 3: '#30d158', 4: '#ff453a', 5: '#bf5af2', 6: '#64d2ff' };
function Avatar({ mode, size = 32 }: { mode: number; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: HUE[mode] }} aria-hidden="true">
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 16 16"><path d="M8 1.5l1.5 4 4 1.5-4 1.5L8 12.5 6.5 8.5l-4-1.5 4-1.5z" fill="#fff" /></svg>
    </span>
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
