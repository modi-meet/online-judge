import Editor from '@monaco-editor/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LANGUAGES, LANGUAGE_SPEC, type Language, type RunResult } from '@oj/contracts';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSubmission, type SubmissionView } from '../lib/useSubmission';
import { VerdictChip, VerdictPanel } from '../components/Verdict';
import { MentorDock, WIDE } from '../components/Mentor';
import { Segmented } from '../components/Segmented';
import { prefersDark } from '../lib/motion';

interface ProblemView {
  problem: { id: string; slug: string; title: string; statement: string; inputFormat: string; outputFormat: string;
             difficulty: string; tags: string[]; timeLimitMs: number; memoryLimitMb: number };
  samples: { idx: number; input: string; output: string }[];
}

const STARTER: Record<Language, string> = {
  cpp17: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n\n    return 0;\n}\n',
  python3: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n\nmain()\n',
  java17: 'import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n\n    }\n}\n',
  node20: "const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\n\n",
};

// the editor buffer survives a refresh. losing forty minutes of work to an
// accidental reload is the worst thing this page can do. lld §13
const bufKey = (slug: string, lang: Language) => `oj:buf:${slug}:${lang}`;
const langKey = (slug: string) => `oj:lang:${slug}`;

// what the user did wrong, in their words: the field for a validation
// failure, the wait for a rate limit, the server's message otherwise.
function describeError(e: unknown) {
  if (e instanceof ApiError && e.code === 'RATE_LIMITED') return `Slow down — try again in ${(e.details as { retryAfterSec: number }).retryAfterSec}s`;
  if (e instanceof ApiError && e.code === 'VALIDATION_FAILED') {
    const first = (e.details as { fields?: { path: string; message: string }[] } | undefined)?.fields?.[0];
    if (first) { const m = `${first.path || 'Request'}: ${first.message}`; return m.charAt(0).toUpperCase() + m.slice(1); }
  }
  return (e as Error).message;
}

export function ProblemPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const contestId = params.get('contest');
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [view, setView] = useState<ProblemView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem(langKey(slug)) as Language) || 'cpp17');
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<'run' | 'submit'>('run');
  const [mine, setMine] = useState<SubmissionView[]>([]);
  const sub = useSubmission();
  // the mentor is a third column on wide screens and a floating dock below;
  // it opens by default only where there is room, and remembers your choice
  const [mentorOpen, setMentorOpen] = useState(() => {
    try { const v = localStorage.getItem('oj:mentor-open'); if (v !== null) return v === '1' && window.matchMedia(WIDE).matches; } catch { /* storage blocked */ }
    return window.matchMedia(WIDE).matches;
  });
  useEffect(() => { try { if (window.matchMedia(WIDE).matches) localStorage.setItem('oj:mentor-open', mentorOpen ? '1' : '0'); } catch { /* storage blocked */ } }, [mentorOpen]);
  const [dark, setDark] = useState(prefersDark);
  const [contest, setContest] = useState<{ title: string; endAt: string; phase: string } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!contestId) { setContest(null); return; }
    api<{ contest: { title: string; endAt: string; phase: string } }>('GET', `/api/contests/${contestId}`).then((r) => setContest(r.contest)).catch(() => setContest(null));
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [contestId]);
  void tick;
  const contestOver = !!contest && (contest.phase === 'ended' || new Date(contest.endAt).getTime() <= Date.now());
  const remaining = contest ? Math.max(0, new Date(contest.endAt).getTime() - Date.now()) : 0;
  const clock = `${Math.floor(remaining / 3600_000)}:${String(Math.floor((remaining % 3600_000) / 60_000)).padStart(2, '0')}:${String(Math.floor((remaining % 60_000) / 1000)).padStart(2, '0')}`;
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const loadMine = async (pid: string) => {
    if (!user) return;
    const r = await api<{ items: SubmissionView[] }>('GET', `/api/submissions?problemId=${pid}&limit=10`).catch(() => ({ items: [] }));
    setMine(r.items);
  };
  useEffect(() => { if (view) void loadMine(view.problem.id); }, [view?.problem.id, user?.id]);
  useEffect(() => {
    // a finished verdict refreshes the history
    if (sub.current && sub.current.judgedAt && view) void loadMine(view.problem.id);
  }, [sub.current?.status, sub.current?.judgedAt]);

  const doSubmit = async () => {
    if (!user || !view) return nav('/login', { state: { from: loc.pathname } });
    setTab('submit'); setError(null);
    try { await sub.submit(view.problem.id, language, code, contestId); } catch (e) {
      const msg = describeError(e);
      setError(msg);
    }
  };

  useEffect(() => {
    api<ProblemView>('GET', `/api/problems/${slug}`)
      .then((v) => { setView(v); setStdin((s) => s || v.samples[0]?.input || ''); })
      .catch((e: Error) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    setCode(localStorage.getItem(bufKey(slug, language)) ?? STARTER[language]);
    localStorage.setItem(langKey(slug), language);
  }, [slug, language]);

  // wiping the buffer is the one irreversible thing on this page; ask only
  // when there is something to lose
  const resetCode = () => {
    const starter = STARTER[language];
    if (code.trim() && code !== starter && code.split('\n').length > 3 && !window.confirm('Replace your code with the starter template?')) return;
    onChange(starter);
  };
  const onChange = (v: string | undefined) => {
    const next = v ?? '';
    setCode(next);
    localStorage.setItem(bufKey(slug, language), next);
  };

  const run = async () => {
    if (!user) return nav('/login', { state: { from: loc.pathname } });
    setRunning(true); setResult(null);
    try {
      setResult(await api<RunResult>('POST', '/api/run', { language, code, stdin }));
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
    } finally { setRunning(false); }
  };

  const expected = useMemo(() => view?.samples.find((s) => s.input === stdin)?.output ?? null, [view, stdin]);
  const matches = result && expected !== null && !result.compileError && result.stdout.trimEnd() === expected.trimEnd();

  if (error && !view) return <p className="error">{error}</p>;
  if (!view) return <p className="muted">Loading…</p>;
  const { problem, samples } = view;

  return (
    <div className={`arena ${mentorOpen ? 'mentor-open' : ''}`}>
      <section className="statement">
        {contestId ? (
          <div className="row between wrap contest-bar">
            <Link to={`/contests/${contestId}`} className="muted">← {contest?.title ?? 'contest'}</Link>
            {contest && (contestOver
              ? <span className="chip bad">Contest over · practice only</span>
              : <span className="chip pending" title="time left in the contest"><span className="mono">{clock}</span></span>)}
          </div>
        ) : <Link to="/problems" className="muted">← Problems</Link>}
        <h1>{problem.title}</h1>
        <p className="meta">
          <span className={`diff ${problem.difficulty}`}>{problem.difficulty}</span>
          <span className="muted">{problem.timeLimitMs} ms · {problem.memoryLimitMb} mb</span>
        </p>
        <pre className="prose">{problem.statement}</pre>
        {problem.inputFormat && <><h3>input</h3><pre className="prose">{problem.inputFormat}</pre></>}
        {problem.outputFormat && <><h3>output</h3><pre className="prose">{problem.outputFormat}</pre></>}
        {samples.map((s) => (
          <div key={s.idx} className="sample">
            <h3>sample {s.idx + 1}</h3>
            <div className="io">
              <div><div className="lbl">input</div><pre>{s.input}</pre></div>
              <div><div className="lbl">output</div><pre>{s.output}</pre></div>
            </div>
            <button className="link" onClick={() => { setStdin(s.input); setTab('run'); }}>Use as stdin</button>
          </div>
        ))}
      </section>

      <section className="editor">
        <div className="toolbar">
          <div className="row">
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{LANGUAGE_SPEC[l].name}</option>)}
            </select>
            <button className="link small" onClick={resetCode} disabled={code === STARTER[language]}>Reset to starter</button>
          </div>
          <div className="row">
            <button className="secondary" onClick={() => { setTab('run'); void run(); }} disabled={running}>{running ? 'Running…' : 'Run'}</button>
            <button onClick={() => void doSubmit()} disabled={!!sub.current && !sub.current.judgedAt || contestOver}>{contestId ? 'Submit to contest' : 'Submit'}</button>
          </div>
        </div>
        <div className="editor-frame">
          <Editor
            height="52vh"
            language={LANGUAGE_SPEC[language].editor}
            value={code}
            onChange={onChange}
            theme={dark ? 'vs-dark' : 'light'}
            options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4, padding: { top: 12 }, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', smoothScrolling: true, cursorSmoothCaretAnimation: 'on' }}
          />
        </div>
        <div className="row tabs">
          <Segmented name="arena" value={tab} onChange={setTab}
            options={[{ value: 'run', label: 'Run' }, { value: 'submit', label: 'Submissions' }]} />
        </div>
        {tab === 'run' && (
        <div className="io">
          <div>
            <div className="lbl">stdin</div>
            <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false} />
          </div>
          <div>
            <div className="lbl">
              output
              {result && (result.compileError ? <span className="tag bad">Compile error</span>
                : result.timedOut ? <span className="tag bad">Timed out</span>
                : result.exitCode !== 0 ? <span className="tag bad">Exit {result.exitCode ?? result.signal}</span>
                : matches ? <span className="tag good">Matches sample</span>
                : expected !== null ? <span className="tag bad">Differs from sample</span>
                : <span className="tag">Exit 0</span>)}
              {result && <span className="muted"> · {result.timeMs} ms</span>}
            </div>
            <pre className={`out ${result?.compileError || (result && result.exitCode !== 0) ? 'bad' : ''}`}>
              {!result ? (error ?? '') : result.compileError ?? (result.stdout + (result.stderr ? `\n--- stderr ---\n${result.stderr}` : '') + (result.stdoutTruncated ? '\n[output truncated]' : ''))}
            </pre>
          </div>
        </div>
        )}
        {tab === 'submit' && (
          <div>
            {error && <p className="error">{error}</p>}
            {sub.error && <p className="error">{sub.error}</p>}
            {sub.current && <VerdictPanel s={sub.current} />}
            {mine.length > 0 && (
              <table className="subs">
                <tbody>
                  {mine.map((m) => (
                    <tr key={m.id} className={sub.current?.id === m.id ? 'sel' : ''} onClick={() => { sub.setCurrent(m); if (!m.judgedAt) sub.watch(m.id); }}>
                      <td><VerdictChip status={m.status} /></td>
                      <td className="mono">{LANGUAGE_SPEC[m.language as Language]?.name ?? m.language}</td>
                      <td className="mono muted">{m.timeMs !== null ? `${m.timeMs} ms` : ''}</td>
                      <td className="muted">{new Date(m.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!sub.current && mine.length === 0 && <p className="muted">No submissions yet. Write a solution and hit Submit.</p>}
          </div>
        )}
      </section>
      <MentorDock problemId={problem.id} language={language} code={code} contestId={contestId} signedIn={!!user} open={mentorOpen} setOpen={setMentorOpen} />
    </div>
  );
}
