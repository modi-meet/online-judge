import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { LANGUAGES, objectId } from '@oj/contracts';
import { MODES } from '@oj/mentor';
import { registry } from '@oj/telemetry';
import { authenticate, requireUser } from './auth.js';
import { config } from './config.js';
import { AppError } from './errors.js';
import { logger } from './logger.js';
import { answer, type MentorDeps } from './mentor.js';

const AskBody = z.object({
  problemId: objectId,
  mode: z.coerce.number().int().min(1).max(6),
  language: z.enum(LANGUAGES),
  code: z.string().max(64 * 1024).default(''),
  contestId: objectId.nullable().optional(),
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().max(4000).nullable().optional(),
});

export function createApp(deps: MentorDeps) {
  const app = express();
  app.set('trust proxy', 1);
  app.use((req, res, next) => { const id = req.header('x-request-id') ?? randomUUID(); res.locals['requestId'] = id; res.setHeader('x-request-id', id); next(); });
  app.get('/metrics', async (_req, res) => { res.setHeader('content-type', registry.contentType); res.send(await registry.metrics()); });
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/ai/health' } }));
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '128kb' }));
  app.use(authenticate);

  app.get('/api/ai/health', (_req, res) => res.json({ ok: true, enabled: config.AI_ENABLED === 'true', provider: deps.provider.name }));
  app.get('/api/ai/modes', (_req, res) => res.json({ enabled: config.AI_ENABLED === 'true', modes: Object.values(MODES).map((m) => ({ ...m, systemPrompt: undefined })) }));

  // one question → server-sent events. post because the code goes in the
  // body; the client reads the stream with fetch, not EventSource.
  app.post('/api/ai/mentor', requireUser, async (req, res, next) => {
    if (config.AI_ENABLED !== 'true') return next(new AppError('FORBIDDEN', 'The AI mentor is switched off'));
    const parsed = AskBody.safeParse(req.body);
    if (!parsed.success) return next(new AppError('VALIDATION_FAILED', 'Invalid request', parsed.error.flatten()));
    const ac = new AbortController();
    req.on('close', () => ac.abort());
    const ask = { ...parsed.data, contestId: parsed.data.contestId ?? null, conversationId: parsed.data.conversationId ?? null, message: parsed.data.message ?? null, mode: parsed.data.mode as 1 | 2 | 3 | 4 | 5 | 6, userId: req.user!.sub };
    let started = false;
    try {
      for await (const ev of answer(deps, ask, ac.signal)) {
        if (!started) {
          started = true;
          res.status(200).set({ 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' }).flushHeaders();
        }
        res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`);
      }
      res.end();
    } catch (e) {
      if (!started) return next(e);
      const err = e instanceof AppError ? { code: e.code, message: e.message } : { code: 'INTERNAL', message: 'Mentor failed' };
      logger.error({ err: (e as Error).message }, 'mentor stream failed');
      res.write(`event: error\ndata: ${JSON.stringify(err)}\n\n`);
      res.end();
    }
  });

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such route', requestId: res.locals['requestId'] } }));
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details, requestId: res.locals['requestId'] } });
    logger.error({ err }, 'unhandled');
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Something broke', requestId: res.locals['requestId'] } });
  };
  app.use(onError);
  return app;
}
