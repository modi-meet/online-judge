import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { COMPILE_TIMEOUT_MS, LANGUAGE_SPEC } from '@oj/contracts';
import { run } from './process.js';
import { DEFAULT_LIMITS, type ExecRequest, type ExecResult, type Executor, type Limits } from './types.js';

export interface DockerExecutorOptions {
  /** image tag appended to every runner image, pinned per deploy. never `latest`. */
  imageTag: string;
  /** cpu core this executor pins its containers to. one executor per judge slot. */
  cpuset?: string | undefined;
  /** host directory for per-run scratch dirs. defaults to ~/.oj/scratch: on macos only $HOME is shared with the docker vm, so the system tmpdir would mount as an empty /box. */
  scratchRoot?: string | undefined;
  /** seccomp profile path, or 'unconfined' for development */
  seccomp?: string | undefined;
}

// gnu time prints this after the program exits. the last occurrence on stderr is
// authoritative: time writes it after the child is gone, so the child cannot
// append anything past it.
export interface JudgeSession {
  compileError: string | null;
  compileMs: number;
  run(stdin: string, limits?: Partial<Limits>): Promise<ExecResult>;
  dispose(): Promise<void>;
}

const STAT_RE = /__OJ_STAT__ (\d+\.\d+) (\d+\.\d+) (\d+) (\d+)\s*$/;

/**
 * the v1 executor. every run is a fresh container with the limits from lld §6.4.
 * lifecycle is create → start (attached) → inspect → rm, never `docker run --rm`,
 * because `--rm` removes the container before anything can be read from it.
 *
 * cpu time and peak rss come from gnu time inside the container rather than the
 * cgroup: on a macos dev machine the cgroup files live inside the docker vm and
 * are unreachable from the host (lld §17.2). rusage is the same number on both.
 */
export class DockerExecutor implements Executor {
  readonly kind = 'docker' as const;
  constructor(private readonly opts: DockerExecutorOptions) {}

  async exec(req: ExecRequest): Promise<ExecResult> {
    const s = await this.prepare(req.language, req.code, req.limits);
    try {
      if (s.compileError !== null) {
        return { outcome: 'exited', exitCode: null, signal: null, cpuMs: 0, wallMs: 0, peakMemKb: null, stdout: '', stderr: '', stdoutTruncated: false, compileError: s.compileError };
      }
      return await s.run(req.stdin, req.limits);
    } finally {
      await s.dispose();
    }
  }

  /**
   * the judge compiles once and runs n test cases against the same binary.
   * the scratch dir holds the source and the artefact; every run mounts it read-only.
   */
  async prepare(language: ExecRequest['language'], code: string, limits?: Partial<Limits>): Promise<JudgeSession> {
    const base: Limits = { ...DEFAULT_LIMITS, ...limits };
    const spec = LANGUAGE_SPEC[language];
    const image = `${spec.image}:${this.opts.imageTag}`;
    const root = this.opts.scratchRoot ?? join(homedir(), '.oj', 'scratch');
    await mkdir(root, { recursive: true });
    const dir = await mkdtemp(join(root, 'oj-'));
    await writeFile(join(dir, spec.file), code, 'utf8');

    let compileError: string | null = null;
    let compileMs = 0;
    if (spec.compile) {
      const c = await this.container({
        image, argv: spec.compile, dir, writable: true, stdin: '',
        limits: { ...base, cpuMs: COMPILE_TIMEOUT_MS, wallMs: COMPILE_TIMEOUT_MS, memoryMb: 1024, stderrBytes: 16 * 1024 },
      });
      compileMs = c.wallMs;
      if (c.spawnError || c.exitCode !== 0) compileError = c.spawnError ?? (c.stderr || c.stdout || 'compilation failed');
    }

    const self = this;
    return {
      compileError,
      compileMs,
      async run(stdin, overrides) {
        const l: Limits = { ...base, ...overrides };
        const r = await self.container({ image, argv: spec.run, dir, writable: false, stdin, limits: l });
        return {
          outcome: r.spawnError ? 'spawn_error' : r.oomKilled ? 'oom' : r.timedOut ? 'timeout' : 'exited',
          exitCode: r.exitCode, signal: r.signal, cpuMs: r.cpuMs ?? r.wallMs, wallMs: r.wallMs, peakMemKb: r.peakMemKb,
          stdout: r.stdout, stderr: r.stderr, stdoutTruncated: r.stdoutTruncated, compileError: null,
        };
      },
      dispose: () => rm(dir, { recursive: true, force: true }),
    };
  }

  private async container(p: { image: string; argv: readonly string[]; dir: string; writable: boolean; stdin: string; limits: Limits }) {
    const { limits } = p;
    const createArgs = [
      'create', '-i',
      '--network=none',
      `--memory=${limits.memoryMb}m`, `--memory-swap=${limits.memoryMb}m`,
      '--cpus=1', ...(this.opts.cpuset ? [`--cpuset-cpus=${this.opts.cpuset}`] : []),
      '--pids-limit=64',
      '--ulimit', 'fsize=67108864', '--ulimit', 'nofile=64',
      '--read-only',
      '-v', `${p.dir}:/box:${p.writable ? 'rw' : 'ro'}`,
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
      '--cap-drop=ALL', '--security-opt=no-new-privileges',
      ...(this.opts.seccomp ? [`--security-opt=seccomp=${this.opts.seccomp}`] : []),
      '--user', '65534:65534',
      '-w', '/box',
      p.image,
      '/usr/bin/time', '-f', '__OJ_STAT__ %U %S %M %x', '--', ...p.argv,
    ];
    const created = await run(['docker', ...createArgs], { cwd: p.dir, stdin: '', wallMs: 30_000, stdoutBytes: 4096, stderrBytes: 4096, env: process.env as Record<string, string> });
    const id = created.stdout.toString('utf8').trim();
    if (created.exitCode !== 0 || !id) {
      return { ...empty(), spawnError: `docker create failed: ${created.stderr.toString('utf8').trim()}` };
    }

    try {
      // wall timer is on the host. docker kill is the second line of defence after
      // the in-container limits; never trust the container to police itself.
      const killer = setTimeout(() => { void run(['docker', 'kill', '-s', 'KILL', id], { cwd: p.dir, stdin: '', wallMs: 10_000, stdoutBytes: 1024, stderrBytes: 1024, env: process.env as Record<string, string> }); }, limits.wallMs);
      const started = await run(['docker', 'start', '-ai', id], {
        cwd: p.dir, stdin: p.stdin, wallMs: limits.wallMs + 5_000,
        stdoutBytes: limits.stdoutBytes, stderrBytes: limits.stderrBytes + 128,
        env: process.env as Record<string, string>,
      });
      clearTimeout(killer);

      const inspect = await run(['docker', 'inspect', '--format', '{{.State.ExitCode}} {{.State.OOMKilled}}', id], { cwd: p.dir, stdin: '', wallMs: 10_000, stdoutBytes: 1024, stderrBytes: 1024, env: process.env as Record<string, string> });
      const [exitStr, oomStr] = inspect.stdout.toString('utf8').trim().split(' ');
      const oomKilled = oomStr === 'true';

      let stderr = started.stderr.toString('utf8');
      // gnu time reports a signalled child on its own line and %x reads 0 for it
      const sig = /Command terminated by signal (\d+)\n?/.exec(stderr);
      let cpuMs: number | null = null;
      let peakMemKb: number | null = null;
      let childExit: number | null = null;
      const m = STAT_RE.exec(stderr);
      if (m) {
        cpuMs = Math.round((parseFloat(m[1]!) + parseFloat(m[2]!)) * 1000);
        peakMemKb = parseInt(m[3]!, 10);
        childExit = parseInt(m[4]!, 10);
        stderr = stderr.slice(0, m.index).replace(/\n?Command (exited with non-zero status \d+|terminated by signal \d+)\n?$/, '');
      }
      // gnu time exits with the child's status; a signal shows as 128+n. the
      // in-container timer never fires; a kill from the host leaves no stat line.
      const timedOut = started.wallMs >= limits.wallMs && !m;
      const exitCode = childExit ?? (exitStr ? parseInt(exitStr, 10) : null);
      const signal = sig ? signalName(parseInt(sig[1]!, 10))
        : exitCode !== null && exitCode > 128 ? signalName(exitCode - 128)
        : timedOut ? 'SIGKILL' : null;
      if (sig) stderr = stderr.replace(sig[0], '');
      return {
        exitCode: signal ? null : exitCode,
        signal,
        stdout: started.stdout.toString('utf8'),
        stderr,
        stdoutTruncated: started.stdoutTruncated,
        timedOut: timedOut || (cpuMs !== null && cpuMs > limits.cpuMs),
        oomKilled,
        cpuMs,
        peakMemKb,
        wallMs: started.wallMs,
        spawnError: null as string | null,
      };
    } finally {
      await run(['docker', 'rm', '-f', id], { cwd: p.dir, stdin: '', wallMs: 15_000, stdoutBytes: 1024, stderrBytes: 1024, env: process.env as Record<string, string> });
    }
  }
}

const empty = () => ({
  exitCode: null as number | null, signal: null as string | null, stdout: '', stderr: '', stdoutTruncated: false,
  timedOut: false, oomKilled: false, cpuMs: null as number | null, peakMemKb: null as number | null, wallMs: 0, spawnError: null as string | null,
});

const SIGNALS: Record<number, string> = { 6: 'SIGABRT', 8: 'SIGFPE', 9: 'SIGKILL', 11: 'SIGSEGV', 13: 'SIGPIPE', 15: 'SIGTERM', 24: 'SIGXCPU', 25: 'SIGXFSZ' };
const signalName = (n: number) => SIGNALS[n] ?? `SIG${n}`;
