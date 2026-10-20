import { Queue, Worker, type ConnectionOptions, type JobsOptions, type Processor } from 'bullmq';
import { Redis } from 'ioredis';

export const JUDGE_QUEUE = 'judge';

/** reference only. the worker fetches code and test cases itself; the queue never carries payloads. */
export interface JudgeJob {
  submissionId: string;
}

/** lower number = sooner. interactive and contest traffic jump a practice backlog. lld §5 */
export const PRIORITY = { contest: 1, interactive: 3, practice: 5, rejudge: 9 } as const;

export const JOB_DEFAULTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: 1000,
  removeOnFail: false,
};

/** bullmq needs its own connection with blocking commands allowed */
export const queueConnection = (url: string): ConnectionOptions =>
  new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: false });

export function judgeQueue(url: string) {
  return new Queue<JudgeJob>(JUDGE_QUEUE, { connection: queueConnection(url), defaultJobOptions: JOB_DEFAULTS });
}

export function judgeWorker(url: string, concurrency: number, processor: Processor<JudgeJob>) {
  return new Worker<JudgeJob>(JUDGE_QUEUE, processor, {
    connection: queueConnection(url),
    concurrency,
    // longer than the worst 25 s judgement with headroom; renewed while alive
    lockDuration: 90_000,
    lockRenewTime: 30_000,
  });
}

export type { Job } from 'bullmq';
