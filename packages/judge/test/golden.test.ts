import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Language } from '@oj/contracts';
import { DockerExecutor } from '@oj/sandbox';
import { compare, mapOutcome } from '../src/index.js';

// the golden-verdict suite (hld §14). every fixture is a (code, expected
// verdict) pair on one tiny problem; every terminal state a program can
// cause is covered, plus the containment cases from §11. runs against real
// docker and is the promotion gate for a deploy: one mismatch blocks it.
//
// lld §17.2: tle and mle are indicative on macos (no cgroup access, cpu time
// from gnu time), so the limits here leave room. ci runs this on linux.

const DIR = join(import.meta.dirname, 'golden');
const PROBLEM = {
  cases: [
    { input: '1 2\n', output: '3\n' },
    { input: '-5 5\n', output: '0\n' },
    { input: '1000000000 1000000000\n', output: '2000000000\n' },
    { input: '3000000000 3000000000\n', output: '6000000000\n' },
  ],
  limits: { cpuMs: 1000, wallMs: 3000, memoryMb: 256, stdoutBytes: 16 * 1024 },
};
const EXT: Record<string, Language> = { cpp: 'cpp17', c: 'c', py: 'python3', java: 'java17', js: 'node20' };

const fixtures = readdirSync(DIR).filter((f) => /\.(cpp|c|py|java|js)$/.test(f)).sort().map((file) => {
  const code = readFileSync(join(DIR, file), 'utf8');
  const expected = /verdict: ([A-Z]+)/.exec(code)?.[1];
  if (!expected) throw new Error(`${file}: missing "verdict:" header`);
  return { file, code, expected, language: EXT[file.split('.').pop()!]! };
});

const executor = new DockerExecutor({ imageTag: process.env['SANDBOX_IMAGE_TAG'] ?? 'dev' });

/** the judge loop from judgeSubmission, without mongo: compile once, run each case, first non-ac wins */
async function judge(language: Language, code: string) {
  const s = await executor.prepare(language, code, PROBLEM.limits);
  try {
    if (s.compileError !== null) return 'CE';
    for (const c of PROBLEM.cases) {
      const r = await s.run(c.input, PROBLEM.limits);
      const v = mapOutcome(r, PROBLEM.limits) ?? (compare('trim', r.stdout, c.output) ? 'AC' : 'WA');
      if (v !== 'AC') return v;
    }
    return 'AC';
  } finally { await s.dispose(); }
}

describe('golden verdicts', () => {
  for (const f of fixtures) {
    it(`${f.file} → ${f.expected}`, async () => {
      expect(await judge(f.language, f.code)).toBe(f.expected);
    }, 60_000);
  }
});
