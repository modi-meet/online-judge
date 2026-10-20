import { HTTP_STATUS, type ErrorCode } from '@oj/contracts';

export class AppError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly details?: unknown) { super(message); }
  get status() { return HTTP_STATUS[this.code]; }
}
