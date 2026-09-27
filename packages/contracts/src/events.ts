import { z } from 'zod';
import { objectId } from './api.js';
import { LANGUAGES } from './language.js';
import { TERMINAL } from './verdict.js';

// every message on the event log wears this envelope. payload fields are only
// ever added, never removed or retyped; a breaking change bumps `version`.

export const Envelope = z.object({
  eventId: z.string().uuid(),
  type: z.string(),
  version: z.literal(1),
  occurredAt: z.string().datetime(),
  producer: z.string(),
  payload: z.unknown(),
});
export type Envelope = z.infer<typeof Envelope>;

export const SubmissionCreated = z.object({
  submissionId: objectId,
  userId: objectId,
  problemId: objectId,
  contestId: objectId.nullable(),
  language: z.enum(LANGUAGES),
  submittedAt: z.string().datetime(),
});
export type SubmissionCreated = z.infer<typeof SubmissionCreated>;

export const SubmissionJudged = SubmissionCreated.extend({
  status: z.enum(TERMINAL),
  failedTestcaseIdx: z.number().int().nullable(),
  passedCount: z.number().int(),
  totalCount: z.number().int(),
  timeMs: z.number().nullable(),
  memoryKb: z.number().nullable(),
  judgedAt: z.string().datetime(),
});
export type SubmissionJudged = z.infer<typeof SubmissionJudged>;

export const TOPICS = {
  submissionCreated: 'submission.created',
  submissionJudged: 'submission.judged',
  submissionJudgedDlq: 'submission.judged.dlq',
  problemIngested: 'problem.ingested',
  aiInteractionLogged: 'ai.interaction.logged',
} as const;
