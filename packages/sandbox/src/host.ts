import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COMPILE_TIMEOUT_MS, LANGUAGE_SPEC } from '@oj/contracts';
import { run } from './process.js';
import { DEFAULT_LIMITS, type ExecRequest, type ExecResult, type Executor } from './types.js';

/**
 * v0 only. shells out on the host with no isolation at all, so the editor and
 * /run can be built before the docker runner exists. unreachable outside local
 * development — see lld §6.6. deleted when v1 merges.
 */
export class HostExecutor implements Executor {
  readonly kind = 'host' as const;

  constructor() {
    const env = process.env['NODE_ENV'] ?? 'development';
    if (env === 'production') {
      throw new Error('HostExecutor must never run in production (lld §6.6)');
    }
    if (process.env['ALLOW_HOST_EXECUTOR'] !== 'true') {
      throw new Error('HostExecutor is disabled: set ALLOW_HOST_EXECUTOR=true in local .env only');
    }
  }

  async exec(req: ExecRequest): Promise<ExecResult> {
    const limits = { ...DEFAULT_LIMITS, ...req.limits };
    const spec = LANGUAGE_SPEC[req.language];
    const dir = await mkdtemp(join(tmpdir(), 'oj-run-'));
    try {
      await writeFile(join(dir, spec.file), req.code, 'utf8');

      if (spec.compile) {
        const c = await run(spec.compile, {
          cwd: dir, stdin: '', wallMs: COMPILE_TIMEOUT_MS,
          stdoutBytes: limits.stderrBytes, stderrBytes: limits.stderrBytes,
        });
        if (c.spawnError || c.exitCode !== 0) {
          return {
            outcome: c.spawnError ? 'spawn_error' : 'exited',
            exitCode: c.exitCode, signal: c.signal, cpuMs: 0, wallMs: c.wallMs, peakMemKb: null,
            stdout: '', stderr: '', stdoutTruncated: false,
            compileError: c.spawnError ?? (c.stderr.toString('utf8') || c.stdout.toString('utf8') || 'compilation failed'),
          };
        }
      }

      const r = await run(spec.run, {
        cwd: dir, stdin: req.stdin, wallMs: limits.wallMs,
        stdoutBytes: limits.stdoutBytes, stderrBytes: limits.stderrBytes,
      });
      return {
        outcome: r.spawnError ? 'spawn_error' : r.timedOut ? 'timeout' : 'exited',
        exitCode: r.exitCode,
        signal: r.signal,
        // the host cannot read a cgroup; wall time stands in. the docker runner replaces this.
        cpuMs: r.wallMs,
        wallMs: r.wallMs,
        peakMemKb: null,
        stdout: r.stdout.toString('utf8'),
        stderr: r.stderr.toString('utf8'),
        stdoutTruncated: r.stdoutTruncated,
        compileError: null,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
