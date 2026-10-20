// an adapter turns one source into raw problems. it knows nothing about
// mongo or our schema; the normalizer does that. hld §8.9.

export interface RawTestcase { input: string; output: string; isSample?: boolean }

export interface RawProblem {
  externalId: string;
  url?: string;
  license?: string;
  title: string;
  statement: string;
  inputFormat?: string;
  outputFormat?: string;
  /** either our scale or a numeric rating the normalizer maps */
  difficulty?: 'easy' | 'medium' | 'hard' | number;
  tags?: string[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
  checkerType?: 'exact' | 'trim' | 'float';
  floatEps?: number;
  testcases: RawTestcase[];
}

export interface Adapter {
  readonly site: string;
  problems(): AsyncIterable<RawProblem>;
}
