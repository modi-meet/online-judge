import { useCallback, useRef, useState } from 'react';
import { getAccessToken, refresh } from './api';

// a conversation with one persona on one problem. the transcript the user
// sees lives here; the server keeps its own copy (with the trace and the
// context) under the conversation id, so only the typed message travels.

export interface ModeInfo { id: number; key: string; name: string; stage: string; needsExecution: boolean; streaming: boolean }
export interface ChatTurn { role: 'user' | 'assistant'; text: string; blocked?: boolean; cached?: boolean }

export interface MentorState {
  conversationId: string | null;
  turns: ChatTurn[];
  status: string | null;
  busy: boolean;
  error: string | null;
  remaining: number | null;
}

const initial: MentorState = { conversationId: null, turns: [], status: null, busy: false, error: null, remaining: null };

export function useMentor() {
  const [state, setState] = useState<MentorState>(initial);
  const abort = useRef<AbortController | null>(null);

  const reset = useCallback(() => { abort.current?.abort(); setState(initial); }, []);
  // each persona keeps its own thread while you look at another one; the
  // server still holds the transcript for two hours, this is just the view
  const stash = useRef(new Map<number, MentorState>());
  const switchTo = useCallback((from: number, to: number) => {
    abort.current?.abort();
    setState((s) => {
      stash.current.set(from, { ...s, busy: false, status: null, error: null });
      return stash.current.get(to) ?? initial;
    });
  }, []);
  const clear = useCallback((mode: number) => { stash.current.delete(mode); reset(); }, [reset]);

  /** sends one turn. with no conversation yet, the server builds the context and opens one. */
  const send = useCallback(async (body: { problemId: string; mode: number; language: string; code: string; contestId?: string | null }, message: string) => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setState((s) => ({
      ...s, busy: true, error: null, status: null,
      turns: [...s.turns, ...(message.trim() ? [{ role: 'user' as const, text: message.trim() }] : []), { role: 'assistant' as const, text: '' }],
    }));
    const patchLast = (f: (t: ChatTurn) => ChatTurn) => setState((s) => ({ ...s, turns: s.turns.map((t, i) => (i === s.turns.length - 1 ? f(t) : t)) }));
    const payload = { ...body, message: message.trim() || null };
    const call = (conversationId: string | null) => fetch('/api/ai/mentor', {
      method: 'POST', signal: ac.signal, credentials: 'include',
      headers: { 'content-type': 'application/json', ...(getAccessToken() ? { authorization: `Bearer ${getAccessToken()}` } : {}) },
      body: JSON.stringify({ ...payload, conversationId }),
    });
    try {
      let res = await call(stateRef.current.conversationId);
      if (res.status === 401 && (await refresh())) res = await call(stateRef.current.conversationId);
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setState((s) => ({ ...s, busy: false, error: j?.error?.message ?? res.statusText, turns: s.turns.slice(0, -1) }));
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
          if (ev === 'meta') { setState((s) => ({ ...s, conversationId: String(d['conversationId']) })); if (d['cached']) patchLast((t) => ({ ...t, cached: true })); }
          else if (ev === 'status') setState((s) => ({ ...s, status: String(d['text']) }));
          else if (ev === 'token') { setState((s) => ({ ...s, status: null })); patchLast((t) => ({ ...t, text: t.text + String(d['text']) })); }
          else if (ev === 'blocked') { setState((s) => ({ ...s, status: null })); patchLast((t) => ({ ...t, blocked: true, text: String(d['text']) })); }
          else if (ev === 'done') setState((s) => ({ ...s, busy: false, status: null, remaining: Number(d['remaining']) }));
          else if (ev === 'error') setState((s) => ({ ...s, busy: false, status: null, error: String(d['message']) }));
        }
      }
      setState((s) => ({ ...s, busy: false }));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setState((s) => ({ ...s, busy: false, error: (e as Error).message }));
    }
  }, []);

  // the latest conversation id without re-creating `send` on every render
  const stateRef = useRef(state); stateRef.current = state;

  const stop = useCallback(() => { abort.current?.abort(); setState((s) => ({ ...s, busy: false, status: null })); }, []);
  return { ...state, send, stop, reset, switchTo, clear };
}
