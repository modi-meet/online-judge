import { HTTP_STATUS, type ErrorCode } from '@oj/contracts';

/** the only error type handlers throw. the error middleware maps it to the envelope. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
  get status() {
    return HTTP_STATUS[this.code];
  }
}

export const notFound = (what = 'resource') => new AppError('NOT_FOUND', `${what[0]!.toUpperCase()}${what.slice(1)} not found`);
export const forbidden = () => new AppError('FORBIDDEN', 'Not allowed');
export const unauthenticated = () => new AppError('UNAUTHENTICATED', 'Sign in required');
