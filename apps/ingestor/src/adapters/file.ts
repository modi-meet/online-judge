import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { Adapter, RawProblem } from './types.js';

// a json bundle on disk: `[problem, ...]` or `{ "site": "...", "problems": [...] }`.
// this is how hand-written and exported problem sets come in; a site adapter
// that scrapes would produce the same shape.
const Testcase = z.object({ input: z.string(), output: z.string(), isSample: z.boolean().optional() });
const Problem = z.object({
  externalId: z.string().min(1),
  url: z.string().url().optional(),
  license: z.string().optional(),
  title: z.string().min(1),
  statement: z.string().min(1),
  inputFormat: z.string().optional(),
  outputFormat: z.string().optional(),
  difficulty: z.union([z.enum(['easy', 'medium', 'hard']), z.number()]).optional(),
  tags: z.array(z.string()).optional(),
  timeLimitMs: z.number().optional(),
  memoryLimitMb: z.number().optional(),
  checkerType: z.enum(['exact', 'trim', 'float']).optional(),
  floatEps: z.number().optional(),
  testcases: z.array(Testcase).min(1),
});
const Bundle = z.union([z.array(Problem), z.object({ site: z.string().optional(), problems: z.array(Problem) })]);

export class FileAdapter implements Adapter {
  readonly site: string;
  private readonly list: RawProblem[];
  private constructor(site: string, list: RawProblem[]) { this.site = site; this.list = list; }

  static async open(path: string, site?: string) {
    const parsed = Bundle.parse(JSON.parse(await readFile(path, 'utf8')));
    const list = Array.isArray(parsed) ? parsed : parsed.problems;
    const name = site ?? (Array.isArray(parsed) ? undefined : parsed.site) ?? 'file';
    return new FileAdapter(name, list as RawProblem[]);
  }

  async *problems() { yield* this.list; }
}
