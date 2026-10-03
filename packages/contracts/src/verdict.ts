// the single vocabulary for a submission's lifecycle. every service imports this;
// nobody redeclares it. a rename here breaks the build instead of production.

export const PENDING = ['QUEUED', 'COMPILING', 'RUNNING'] as const;
export const TERMINAL = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'OLE', 'IE'] as const;
export const STATUSES = [...PENDING, ...TERMINAL] as const;

export type Pending = (typeof PENDING)[number];
export type Terminal = (typeof TERMINAL)[number];
export type Status = Pending | Terminal;

export const isTerminal = (s: Status): s is Terminal =>
  (TERMINAL as readonly string[]).includes(s);

export const isPending = (s: Status): s is Pending =>
  (PENDING as readonly string[]).includes(s);

/** verdicts that count as a wrong attempt for icpc penalty. ce and ie do not. */
export const PENALISED: readonly Terminal[] = ['WA', 'TLE', 'MLE', 'RE', 'OLE'];

export const VERDICT_LABEL: Record<Terminal, string> = {
  AC: 'accepted',
  WA: 'wrong answer',
  TLE: 'time limit exceeded',
  MLE: 'memory limit exceeded',
  RE: 'runtime error',
  CE: 'compilation error',
  OLE: 'output limit exceeded',
  IE: 'internal error',
};
