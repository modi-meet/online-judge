import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
  }
}

// first in the chain. the same id goes in the response header, every log
// line and (later) the otel trace, so one string finds everything.
export const requestId: RequestHandler = (req, res, next) => {
  req.id = req.header('x-request-id') ?? randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
};
