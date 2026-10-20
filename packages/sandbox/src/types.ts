import type { Language } from '@oj/contracts';

export interface Limits {
  /** decides tle. cpu time of the program, from gnu time inside the container. */
  cpuMs: number;
  /** the kill timer. always >= cpuMs. */
  wallMs: number;
  memoryMb: number;
  /** stdout cap; beyond it the run is killed and marked truncated (ole). */
  stdoutBytes: number;
  /** stderr is capped too, keeping the last bytes — the useful part of a stack trace. */
  stderrBytes: number;
}

export const DEFAULT_LIMITS: Limits = {
  cpuMs: 2_000,
  wallMs: 5_000,
  memoryMb: 256,
  stdoutBytes: 64 * 1024,
  stderrBytes: 8 * 1024,
};

export interface ExecRequest {
  language: Language;
  code: string;
  stdin: string;
  limits?: Partial<Limits>;
}

export type Outcome = 'exited' | 'timeout' | 'oom' | 'spawn_error';

export interface ExecResult {
  outcome: Outcome;
  exitCode: number | null;
  signal: string | null;
  cpuMs: number;
  wallMs: number;
  peakMemKb: number | null;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  /** non-null when compilation failed; nothing was run. */
  compileError: string | null;
}

/** the one thing allowed to spawn a process. the docker runner is the only implementation. */
export interface Executor {
  readonly kind: 'docker';
  exec(req: ExecRequest): Promise<ExecResult>;
}
