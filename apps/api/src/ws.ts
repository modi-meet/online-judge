import type { IncomingMessage, Server } from 'node:http';
import { Redis } from 'ioredis';
import { WebSocketServer, type WebSocket } from 'ws';
import { UserModel } from '@oj/db';
import { readStandings } from '@oj/judge';
import { config } from './config.js';
import { logger } from './logger.js';
import { redis } from './redis.js';
import { verifyAccess } from './services/auth.js';

// one room per contest. on join: a full snapshot with the current seq; then
// deltas carrying seq. a client that sees a gap asks for a fresh snapshot.
// without the sequence number a dropped delta leaves a permanently wrong
// board on that client, and nobody notices until someone screenshots it. lld §10.2
export function attachWebSockets(server: Server) {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Map<string, Set<WebSocket>>();
  const sub = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  void sub.psubscribe('contest:*:delta');
  sub.on('pmessage', (_p, channel, message) => {
    const contestId = channel.split(':')[1]!;
    const room = rooms.get(contestId);
    if (!room) return;
    const frame = `{"type":"delta","data":${message}}`;
    for (const ws of room) if (ws.readyState === ws.OPEN) ws.send(frame);
  });

  const snapshot = async (contestId: string) => {
    const [seq, rows] = await Promise.all([redis.get(`contest:${contestId}:seq`), readStandings(redis, contestId, 0, 50)]);
    const users = await UserModel.find({ _id: { $in: rows.map((r) => r.userId) } }).select('username').lean();
    const name = new Map(users.map((u) => [String(u._id), u.username]));
    return { type: 'snapshot', seq: Number(seq ?? 0), items: rows.map((r) => ({ ...r, username: name.get(r.userId) ?? '?' })) };
  };

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const m = /^\/ws\/contests\/([a-f\d]{24})$/i.exec(url.pathname);
    if (!m) { socket.destroy(); return; }
    const token = url.searchParams.get('access_token');
    if (!token || !verifyAccess(token)) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return; }
    const contestId = m[1]!;
    wss.handleUpgrade(req, socket, head, (ws) => {
      const room = rooms.get(contestId) ?? new Set<WebSocket>();
      room.add(ws); rooms.set(contestId, room);
      snapshot(contestId).then((s) => ws.send(JSON.stringify(s))).catch((e: Error) => logger.warn({ err: e.message }, 'snapshot failed'));
      ws.on('message', (raw) => {
        // the only client message: { type: 'resync' } after a seq gap
        if (String(raw).includes('resync')) snapshot(contestId).then((s) => ws.send(JSON.stringify(s))).catch(() => undefined);
      });
      const ping = setInterval(() => { if (ws.readyState === ws.OPEN) ws.ping(); }, 20_000);
      ws.on('close', () => { clearInterval(ping); room.delete(ws); if (room.size === 0) rooms.delete(contestId); });
    });
  });

  return { close: () => { sub.disconnect(); wss.close(); } };
}
