import { useCallback, useRef, useState } from 'react';
import { getAccessToken, refresh } from './api';

// the mentor streams server-sent events over a post body (the code travels
// with the question), so this is a fetch + reader rather than EventSource.

export interface ModeInfo { id: number; key: string; name: string; stage: string; needsExecution: boolean; streaming: boolean }

export interface MentorState {
  text: string;
  status: string | null;
  busy: boolean;
  cached: boolean;
  blocked: boolean;
  error: string | null;
  remaining: number | null;
}

const initial: MentorState = { text: '', status: null, busy: false, cached: false, blocked: false, error: null, remaining: null };

export function useMentor() {
  const [state, setState] = useState<MentorState>(initial);
  const abort = useRef<AbortController | null>(null);

  const ask = useCallback(async (body: { problemId: string; mode: number; language: string; code: string; contestId?: string | null }) => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setState({ ...initial, busy: true });
    const send = () => fetch('/api/ai/mentor', {
      method: 'POST', signal: ac.signal, credentials: 'include',
      headers: { 'content-type': 'application/json', ...(getAccessToken() ? { authorization: `Bearer ${getAccessToken()}` } : {}) },
      body: JSON.stringify(body),
    });
    try {
      let res = await send();
      if (res.status === 401 && (await refresh())) res = await send();
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setState((s) => ({ ...s, busy: false, error: j?.error?.message ?? res.statusText }));
        return;
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf('\n\n')) !== -1) {
          const frame = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = /^event: (\w+)/m.exec(frame)?.[1];
          const data = /^data: (.*)$/m.exec(frame)?.[1];
          if (!ev || !data) continue;
          const d = JSON.parse(data) as Record<string, unknown>;
          if (ev === 'meta') setState((s) => ({ ...s, cached: !!d['cached'] }));
          else if (ev === 'status') setState((s) => ({ ...s, status: String(d['text']) }));
          else if (ev === 'token') setState((s) => ({ ...s, status: null, text: s.text + String(d['text']) }));
          else if (ev === 'blocked') setState((s) => ({ ...s, status: null, blocked: true, text: String(d['text']) }));
          else if (ev === 'done') setState((s) => ({ ...s, busy: false, status: null, remaining: Number(d['remaining']) }));
          else if (ev === 'error') setState((s) => ({ ...s, busy: false, status: null, error: String(d['message']) }));
        }
      }
      setState((s) => ({ ...s, busy: false }));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setState((s) => ({ ...s, busy: false, error: (e as Error).message }));
    }
  }, []);

  const stop = useCallback(() => { abort.current?.abort(); setState((s) => ({ ...s, busy: false, status: null })); }, []);
  return { ...state, ask, stop };
}
