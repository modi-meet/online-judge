import { useEffect, useState } from 'react';
import { useMentor, type ModeInfo } from '../lib/useMentor';

// six modes, one per place a learner gets stuck. the panel never sends more
// than the problem id, the mode and the editor buffer; the server assembles
// everything else and never sees a hidden case.

const BLURB: Record<number, string> = {
  1: 'no clue where to start',
  2: 'have an idea, started coding',
  3: 'written it, not sure it is right',
  4: 'correct but too slow',
  5: 'what even is this data structure',
  6: 'new to it, teach me from zero',
};

export function MentorPanel(p: { problemId: string; language: string; code: string; contestId: string | null; signedIn: boolean }) {
  const [modes, setModes] = useState<ModeInfo[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<number>(1);
  const m = useMentor();

  useEffect(() => {
    fetch('/api/ai/modes').then((r) => r.json()).then((j: { enabled: boolean; modes: ModeInfo[] }) => { setEnabled(j.enabled); setModes(j.modes); }).catch(() => setEnabled(false));
  }, []);

  if (!enabled) return <p className="muted">the ai mentor is switched off on this server.</p>;
  if (!modes) return <p className="muted">loading…</p>;

  return (
    <div className="mentor">
      <div className="modes">
        {modes.map((x) => (
          <button key={x.id} className={`mode ${mode === x.id ? 'on' : ''}`} onClick={() => setMode(x.id)} disabled={m.busy}>
            <span className="mono">{x.id}</span>
            <strong>{x.name}</strong>
            <span className="muted">{BLURB[x.id]}</span>
          </button>
        ))}
      </div>
      <div className="row between">
        <span className="muted small">
          {modes.find((x) => x.id === mode)?.needsExecution ? 'runs your code in the sandbox first — nothing is simulated' : 'reads the statement' + (mode === 2 ? ' and your code' : '')}
        </span>
        {m.busy
          ? <button className="secondary" onClick={m.stop}>stop</button>
          : <button onClick={() => void m.ask({ problemId: p.problemId, mode, language: p.language, code: p.code, contestId: p.contestId })} disabled={!p.signedIn}>{p.signedIn ? 'ask' : 'sign in to ask'}</button>}
      </div>
      {m.error && <p className="error">{m.error}</p>}
      {m.status && <p className="muted status">{m.status}</p>}
      {(m.text || m.busy) && (
        <div className={`reply ${m.blocked ? 'blocked' : ''}`}>
          {m.cached && <span className="tag">cached</span>}
          {m.blocked && <span className="tag bad">leak guard</span>}
          <Reply text={m.text} />
          {m.busy && !m.status && <span className="cursor">▍</span>}
        </div>
      )}
      {m.remaining !== null && !m.busy && <p className="muted small">{m.remaining.toLocaleString()} tokens left today</p>}
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
        : <p key={i} className="prose">{s}</p>)}
    </>
  );
}
