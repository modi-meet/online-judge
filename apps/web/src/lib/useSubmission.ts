import { useCallback, useEffect, useRef, useState } from 'react';
import { isTerminal, type Status } from '@oj/contracts';
import { api, getAccessToken } from './api';

export interface SubmissionView {
  id: string; problemId: string; language: string; status: Status; failedTestcaseIdx: number | null;
  passedCount: number; totalCount: number; timeMs: number | null; memoryKb: number | null;
  compilerLog: string; stderrTail: string; submittedAt: string; judgedAt: string | null;
}

/**
 * the one place submission state lives. opens the sse stream, reduces status
 * events into state, closes on a terminal verdict, and falls back to polling
 * if the stream drops. lld §13
 */
export function useSubmission() {
  const [current, setCurrent] = useState<SubmissionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const es = useRef<EventSource | null>(null);
  const poll = useRef<number | null>(null);

  const stop = useCallback(() => {
    es.current?.close(); es.current = null;
    if (poll.current) { window.clearInterval(poll.current); poll.current = null; }
  }, []);

  const watch = useCallback((id: string) => {
    stop();
    const fallback = () => {
      if (poll.current) return;
      poll.current = window.setInterval(async () => {
        try {
          const r = await api<{ submission: SubmissionView }>('GET', `/api/submissions/${id}`);
          setCurrent(r.submission);
          if (isTerminal(r.submission.status)) stop();
        } catch (e) { setError((e as Error).message); stop(); }
      }, 2000);
    };
    // eventsource cannot set headers; the stream endpoint accepts the token as a query param
    const src = new EventSource(`/api/submissions/${id}/stream?access_token=${encodeURIComponent(getAccessToken() ?? '')}`);
    es.current = src;
    src.addEventListener('status', (ev) => {
      const data = JSON.parse((ev as MessageEvent).data) as Partial<SubmissionView> & { status: Status };
      setCurrent((c) => ({ ...(c ?? ({} as SubmissionView)), ...data }));
      if (isTerminal(data.status)) {
        // the first terminal event is the worker's status update, which has no
        // judgedAt; the full row follows but closing the stream here can drop
        // it, and a row that never looks judged keeps the submit button
        // disabled. mark it judged now, then read the durable row once.
        stop();
        setCurrent((c) => (c ? { ...c, judgedAt: c.judgedAt ?? new Date().toISOString() } : c));
        api<{ submission: SubmissionView }>('GET', `/api/submissions/${id}`).then((r) => setCurrent(r.submission)).catch(() => undefined);
      }
    });
    src.addEventListener('timeout', fallback);
    src.onerror = () => { src.close(); fallback(); };
  }, [stop]);

  const submit = useCallback(async (problemId: string, language: string, code: string, contestId?: string | null) => {
    setError(null);
    const key = crypto.randomUUID();
    const r = await api<{ submissionId: string; status: Status }>('POST', '/api/submissions', { problemId, language, code, ...(contestId ? { contestId } : {}) }, { 'idempotency-key': key });
    setCurrent({ id: r.submissionId, problemId, language, status: r.status, failedTestcaseIdx: null, passedCount: 0, totalCount: 0, timeMs: null, memoryKb: null, compilerLog: '', stderrTail: '', submittedAt: new Date().toISOString(), judgedAt: null });
    watch(r.submissionId);
    return r.submissionId;
  }, [watch]);

  useEffect(() => stop, [stop]);
  return { current, error, submit, watch, setCurrent };
}
