import { Router } from 'express';
import { RunBody, type RunResult } from '@oj/contracts';
import type { Executor } from '@oj/sandbox';
import { authenticate, authorize } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';

// the online compiler. synchronous, no verdict, custom stdin. hld §8.3
export function runRouter(executor: Executor) {
  const r = Router();
  r.post('/', authenticate, authorize(), rateLimit('run'), validate('body', RunBody), async (req, res, next) => {
    try {
      const body = req.body as RunBody;
      const x = await executor.exec({ language: body.language, code: body.code, stdin: body.stdin });
      const out: RunResult = {
        stdout: x.stdout,
        stderr: x.stderr,
        exitCode: x.exitCode,
        signal: x.signal,
        timeMs: x.wallMs,
        memoryKb: x.peakMemKb,
        timedOut: x.outcome === 'timeout',
        stdoutTruncated: x.stdoutTruncated,
        compileError: x.compileError,
      };
      res.json(out);
    } catch (e) { next(e); }
  });
  return r;
}
