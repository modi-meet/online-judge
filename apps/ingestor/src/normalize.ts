import { createHash } from 'node:crypto';
import { ProblemBody } from '@oj/contracts';
import type { RawProblem } from './adapters/types.js';

// raw → the shape the catalogue stores. pure: no io, fully unit-tested.
// everything a source can get wrong is handled here, once.

export interface NormalizedProblem {
  slug: string;
  fields: ReturnType<typeof ProblemBody.parse>;
  source: { site: string; url?: string; externalId: string; license?: string };
  testcases: { idx: number; input: string; output: string; isSample: boolean }[];
  /** sha256 of the case set; a change invalidates every worker's cache */
  testcaseSetVersion: string;
}

export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60).replace(/^-|-$/g, '');

/** codeforces-style rating → our three buckets */
export const difficultyOf = (d: RawProblem['difficulty']): 'easy' | 'medium' | 'hard' => {
  if (d === undefined) return 'medium';
  if (typeof d === 'string') return d;
  return d <= 1200 ? 'easy' : d <= 1900 ? 'medium' : 'hard';
};

/** crlf → lf, strip trailing whitespace per line, exactly one trailing newline */
export const normalizeText = (s: string) => `${s.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '')}\n`;

export function normalize(raw: RawProblem, site: string): NormalizedProblem {
  const title = raw.title.trim();
  const slug = slugify(title) || `${site}-${slugify(raw.externalId)}`;
  const tags = [...new Set((raw.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
  const fields = ProblemBody.parse({
    slug,
    title: title.slice(0, 120),
    statement: raw.statement.replace(/\r\n?/g, '\n').trim(),
    inputFormat: (raw.inputFormat ?? '').replace(/\r\n?/g, '\n').trim(),
    outputFormat: (raw.outputFormat ?? '').replace(/\r\n?/g, '\n').trim(),
    difficulty: difficultyOf(raw.difficulty),
    tags,
    timeLimitMs: Math.min(10_000, Math.max(100, Math.round(raw.timeLimitMs ?? 1000))),
    memoryLimitMb: Math.min(1024, Math.max(16, Math.round(raw.memoryLimitMb ?? 256))),
    checkerType: raw.checkerType ?? 'trim',
    ...(raw.checkerType === 'float' ? { floatEps: raw.floatEps ?? 1e-6 } : {}),
    isPublic: false,
  });
  if (raw.testcases.length === 0) throw new Error(`${raw.externalId}: a problem needs at least one test case`);
  const testcases = raw.testcases.map((t, idx) => ({ idx, input: normalizeText(t.input), output: normalizeText(t.output), isSample: t.isSample ?? idx === 0 }));
  if (!testcases.some((t) => t.isSample)) testcases[0]!.isSample = true;
  const testcaseSetVersion = createHash('sha256').update(JSON.stringify(testcases.map((t) => [t.input, t.output]))).digest('hex').slice(0, 16);
  return {
    slug, fields,
    source: { site, externalId: raw.externalId, ...(raw.url ? { url: raw.url } : {}), ...(raw.license ? { license: raw.license } : {}) },
    testcases, testcaseSetVersion,
  };
}
