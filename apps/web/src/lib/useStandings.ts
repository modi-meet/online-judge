import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from './api';

export interface Row { userId: string; username: string; rank: number; solved: number; penalty: number; problems: Record<string, { solvedAt: number | null; wrongBefore: number }> }
interface Delta { seq: number; userId: string; rank: number | null; solved: number; penalty: number; problemId: string; status: string }

/**
 * live standings over websocket: snapshot with seq, then deltas. a gap in seq
 * means a dropped frame — ask for a new snapshot instead of trusting the board.
 * falls back to a 5 s poll of the http leaderboard when the socket cannot open.
 */
export function useStandings(contestId: string, enabled: boolean, poll: () => Promise<Row[]>) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [live, setLive] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | null = null;
    let timer: number | null = null;
    const startPolling = () => {
      if (timer) return;
      setLive(false);
      const tick = () => poll().then(setRows).catch(() => undefined);
      void tick();
      timer = window.setInterval(tick, 5000);
    };
    try {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws/contests/${contestId}?access_token=${encodeURIComponent(getAccessToken() ?? '')}`);
      ws.onopen = () => setLive(true);
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as { type: 'snapshot'; seq: number; items: Row[] } | { type: 'delta'; data: Delta };
        if (msg.type === 'snapshot') { seq.current = msg.seq; setRows(msg.items); return; }
        const d = msg.data;
        if (d.seq !== seq.current + 1) { ws?.send('{"type":"resync"}'); return; }
        seq.current = d.seq;
        // a delta only tells us one user's new score; re-rank locally from the scores we hold
        setRows((cur) => {
          const next = (cur ?? []).filter((r) => r.userId !== d.userId);
          const mine = (cur ?? []).find((r) => r.userId === d.userId);
          const problems = { ...(mine?.problems ?? {}) };
          const p = problems[d.problemId] ?? { solvedAt: null, wrongBefore: 0 };
          problems[d.problemId] = d.status === 'AC' ? { ...p, solvedAt: p.solvedAt ?? 0 } : { ...p, wrongBefore: p.wrongBefore + (['WA', 'TLE', 'MLE', 'RE', 'OLE'].includes(d.status) ? 1 : 0) };
          next.push({ userId: d.userId, username: mine?.username ?? '…', rank: 0, solved: d.solved, penalty: d.penalty, problems });
          next.sort((a, b) => b.solved - a.solved || a.penalty - b.penalty);
          return next.map((r, i) => ({ ...r, rank: i + 1 }));
        });
      };
      ws.onerror = () => { ws?.close(); startPolling(); };
      ws.onclose = () => { if (!timer) startPolling(); };
    } catch { startPolling(); }
    return () => { ws?.close(); if (timer) window.clearInterval(timer); };
  }, [contestId, enabled, poll]);

  return { rows, live };
}
