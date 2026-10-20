import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Executor } from '@oj/sandbox';
import { config } from './config.js';
import { logger } from './logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import { authRouter } from './routes/auth.js';
import { problemsRouter } from './routes/problems.js';
import { runRouter } from './routes/run.js';
import { usersRouter } from './routes/users.js';

// chain order is load-bearing. lld §4.1
export function createApp(deps: { executor: Executor }) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => (req as express.Request).id, autoLogging: config.NODE_ENV !== 'test' }));
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '128kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ ok: true, executor: deps.executor.kind }));
  app.use('/api/auth', authRouter);
  app.use('/api/problems', problemsRouter);
  app.use('/api/run', runRouter(deps.executor));
  app.use('/api/users', usersRouter);

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'no such route', requestId: res.getHeader('x-request-id') } }));
  app.use(errorHandler);
  return app;
}
