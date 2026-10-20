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

export const notFound = (what = 'resource') => new AppError('NOT_FOUND', `${what} not found`);
export const forbidden = () => new AppError('FORBIDDEN', 'not allowed');
export const unauthenticated = () => new AppError('UNAUTHENTICATED', 'sign in required');
