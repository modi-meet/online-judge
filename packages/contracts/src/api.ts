import { z } from 'zod';
import { LANGUAGES } from './language.js';
import { STATUSES } from './verdict.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'expected a 24-hex object id');

/** source cap. 64 kb is generous for a contest solution and small enough to inline in a request. */
export const MAX_SOURCE_BYTES = 64 * 1024;
export const MAX_STDIN_BYTES = 64 * 1024;

export const RegisterBody = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/, 'lowercase letters, digits and underscore only'),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});
export type RegisterBody = z.infer<typeof RegisterBody>;

export const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof LoginBody>;

export const RunBody = z.object({
  language: z.enum(LANGUAGES),
  code: z.string().min(1).max(MAX_SOURCE_BYTES),
  stdin: z.string().max(MAX_STDIN_BYTES).default(''),
});
export type RunBody = z.infer<typeof RunBody>;

export const RunResult = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int().nullable(),
  signal: z.string().nullable(),
  timeMs: z.number(),
  memoryKb: z.number().nullable(),
  timedOut: z.boolean(),
  stdoutTruncated: z.boolean(),
  compileError: z.string().nullable(),
});
export type RunResult = z.infer<typeof RunResult>;

export const SubmitBody = z.object({
  problemId: objectId,
  language: z.enum(LANGUAGES),
  code: z.string().min(1).max(MAX_SOURCE_BYTES),
  contestId: objectId.optional(),
});
export type SubmitBody = z.infer<typeof SubmitBody>;

export const Difficulty = z.enum(['easy', 'medium', 'hard']);
export const CheckerType = z.enum(['exact', 'trim', 'float', 'custom']);

export const ProblemBody = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(120),
  statement: z.string().min(1),
  inputFormat: z.string().default(''),
  outputFormat: z.string().default(''),
  difficulty: Difficulty,
  tags: z.array(z.string().min(1).max(32)).max(10).default([]),
  timeLimitMs: z.number().int().min(100).max(10_000).default(1000),
  memoryLimitMb: z.number().int().min(16).max(1024).default(256),
  checkerType: CheckerType.default('trim'),
  floatEps: z.number().positive().optional(),
  isPublic: z.boolean().default(false),
});
export type ProblemBody = z.infer<typeof ProblemBody>;

export const TestcaseBody = z.object({
  input: z.string(),
  output: z.string(),
  isSample: z.boolean().default(false),
});
export type TestcaseBody = z.infer<typeof TestcaseBody>;

export const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  difficulty: Difficulty.optional(),
  tag: z.string().optional(),
  q: z.string().max(64).optional(),
});
export type ListQuery = z.infer<typeof ListQuery>;

export const SubmissionStatus = z.enum(STATUSES);

export const ContestBody = z
  .object({
    title: z.string().min(1).max(120),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    problems: z.array(z.object({ problemId: objectId, points: z.number().int().min(1).default(100) })).min(1).max(26),
    scoring: z.enum(['icpc', 'ioi']).default('icpc'),
    aiMentorEnabled: z.boolean().default(false),
  })
  .refine((c) => c.endAt > c.startAt, { message: 'endAt must be after startAt', path: ['endAt'] });
export type ContestBody = z.infer<typeof ContestBody>;

/** the error envelope every endpoint returns on failure. see lld §15 */
export const ErrorCode = z.enum([
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'TOKEN_REUSE_DETECTED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'CONTEST_NOT_RUNNING',
  'RATE_LIMITED',
  'AI_DISABLED_IN_CONTEST',
  'AI_BUDGET_EXCEEDED',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorEnvelope = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  TOKEN_REUSE_DETECTED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  CONTEST_NOT_RUNNING: 409,
  RATE_LIMITED: 429,
  AI_DISABLED_IN_CONTEST: 409,
  AI_BUDGET_EXCEEDED: 429,
  INTERNAL: 500,
};
