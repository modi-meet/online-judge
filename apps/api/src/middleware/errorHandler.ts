import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';

// last in the chain. unknown errors become INTERNAL with a generic message;
// the detail goes to the log under the request id, never to the client.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details, requestId: req.id },
    });
    return;
  }
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'VALIDATION_FAILED', message: 'payload too large', requestId: req.id } });
    return;
  }
  logger.error({ err, requestId: req.id }, 'unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL', message: 'something went wrong', requestId: req.id } });
};
