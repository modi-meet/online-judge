import { useEffect, useRef, useState } from 'react';
import { useMentor, type ModeInfo } from '../lib/useMentor';

// a chat with one persona per mode. picking a mode starts a conversation
// about this problem; the first turn carries the problem, the editor
// contents and, for modes 3 and 4, a real run in the sandbox. the client
// only ever sends what the learner types; the server holds the rest.

const BLURB: Record<number, string> = {
  1: 'no clue where to start',
  2: 'have an idea, started coding',
  3: 'written it, not sure it is right',
  4: 'correct but too slow',
  5: 'what even is this data structure',
  6: 'new to it, teach me from zero',
};

const OPENER: Record<number, string> = {
  1: 'start with the problem as it is: which family does this belong to, and why?',
  2: 'look at my code so far and find the one gap that matters most.',
  3: 'run my code on the sample and walk me through what actually happens.',
  4: 'time my code and tell me what is making it slow.',
  5: 'explain the idea behind this problem without any code.',
  6: 'teach me the data structure this needs, from zero, and tell me what to practise.',
};

export function MentorPanel(p: { problemId: string; language: string; code: string; contestId: string | null; signedIn: boolean }) {
  const [modes, setModes] = useState<ModeInfo[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<number>(1);
  const [draft, setDraft] = useState('');
  const m = useMentor();
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/ai/modes').then((r) => r.json()).then((j: { enabled: boolean; modes: ModeInfo[] }) => { setEnabled(j.enabled); setModes(j.modes); }).catch(() => setEnabled(false));
  }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [m.turns]);

  if (!enabled) return <p className="muted">the ai mentor is switched off on this server.</p>;
  if (!modes) return <p className="muted">loading…</p>;
  const persona = modes.find((x) => x.id === mode)!;
  const started = m.conversationId !== null || m.turns.length > 0;

  const pick = (id: number) => { if (id === mode) return; m.reset(); setMode(id); setDraft(''); };
  const submit = () => {
    if (m.busy) return;
    const text = draft;
    setDraft('');
    void m.send({ problemId: p.problemId, mode, language: p.language, code: p.code, contestId: p.contestId }, text);
  };

  return (
    <div className="mentor">
      <div className="modes">
        {modes.map((x) => (
          <button key={x.id} className={`mode ${mode === x.id ? 'on' : ''}`} onClick={() => pick(x.id)} disabled={m.busy}>
            <span className="mono">{x.id}</span>
            <strong>{x.name}</strong>
            <span className="muted">{BLURB[x.id]}</span>
          </button>
        ))}
      </div>

      <div className="chat">
        <div className="chat-head row between">
          <span className="small">
            <strong>{persona.name}</strong>
            <span className="muted"> · {persona.needsExecution ? 'runs your code in the sandbox first — nothing is simulated' : 'reads the statement' + (mode === 2 ? ' and your code' : '')}</span>
          </span>
          {started && <button className="link small" onClick={() => { m.reset(); setDraft(''); }}>new conversation</button>}
        </div>

        <div className="chat-log" ref={log}>
          {!started && <p className="muted small opener">{persona.name} is ready. send a message, or just press ask and it opens with: “{OPENER[mode]}”</p>}
          {m.turns.map((t, i) => (
            <div key={i} className={`bubble ${t.role} ${t.blocked ? 'blocked' : ''}`}>
              {t.cached && <span className="tag">cached</span>}
              {t.blocked && <span className="tag bad">leak guard</span>}
              {t.role === 'assistant' && !t.text && m.busy ? <span className="muted">{m.status ?? 'thinking…'}</span> : <Reply text={t.text} />}
              {t.role === 'assistant' && t.text && m.busy && i === m.turns.length - 1 && <span className="cursor">▍</span>}
            </div>
          ))}
        </div>

        {m.error && <p className="error small">{m.error}</p>}
        <form className="chat-input row" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={p.signedIn ? (started ? `reply to ${persona.name}…` : 'ask, or leave empty for the opening question') : 'sign in to talk to the mentor'}
            disabled={!p.signedIn || m.busy}
            maxLength={4000}
          />
          {m.busy
            ? <button type="button" className="secondary" onClick={m.stop}>stop</button>
            : <button type="submit" disabled={!p.signedIn || (started && !draft.trim())}>{started ? 'send' : 'ask'}</button>}
        </form>
        {m.remaining !== null && !m.busy && <p className="muted small">{m.remaining.toLocaleString()} tokens left today</p>}
      </div>
    </div>
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
