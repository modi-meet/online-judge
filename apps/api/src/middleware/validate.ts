import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { AppError } from '../errors.js';

type Part = 'body' | 'query' | 'params';

/** validates one part of the request and replaces it with the parsed value. */
export function validate<T extends ZodTypeAny>(part: Part, schema: T): RequestHandler {
  return (req, _res, next) => {
    const r = schema.safeParse(req[part]);
    if (!r.success) {
      return next(
        new AppError('VALIDATION_FAILED', 'Request failed validation', {
          fields: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        }),
      );
    }
    (req as unknown as Record<Part, z.infer<T>>)[part] = r.data;
    next();
  };
}
