import { spawn } from 'node:child_process';

export interface SpawnOutcome {
  exitCode: number | null;
  signal: string | null;
  stdout: Buffer;
  stderr: Buffer;
  stdoutTruncated: boolean;
  timedOut: boolean;
  spawnError: string | null;
  wallMs: number;
}

interface SpawnOpts {
  cwd: string;
  stdin: string;
  wallMs: number;
  stdoutBytes: number;
  stderrBytes: number;
  env?: Record<string, string>;
}

/**
 * runs argv with a hard kill ladder: at wallMs send SIGKILL; stdout is cut at
 * stdoutBytes (and the process killed, because an unbounded pipe is how the
 * *host* runs out of memory); stderr keeps its last stderrBytes.
 */
export function run(argv: readonly string[], opts: SpawnOpts): Promise<SpawnOutcome> {
  return new Promise((resolve) => {
    const started = Date.now();
    const out: Buffer[] = [];
    let outLen = 0;
    let stdoutTruncated = false;
    let errBuf = Buffer.alloc(0);
    let timedOut = false;

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(argv[0]!, argv.slice(1), {
        cwd: opts.cwd,
        env: opts.env ?? { PATH: process.env['PATH'] ?? '' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e) {
      resolve({
        exitCode: null, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0),
        stdoutTruncated: false, timedOut: false, spawnError: String(e), wallMs: 0,
      });
      return;
    }

    const kill = () => { try { child.kill('SIGKILL'); } catch { /* already gone */ } };
    const timer = setTimeout(() => { timedOut = true; kill(); }, opts.wallMs);

    child.stdout!.on('data', (chunk: Buffer) => {
      if (stdoutTruncated) return;
      const room = opts.stdoutBytes - outLen;
      if (chunk.length > room) {
        out.push(chunk.subarray(0, room));
        outLen += room;
        stdoutTruncated = true;
        kill();
      } else {
        out.push(chunk);
        outLen += chunk.length;
      }
    });
    child.stderr!.on('data', (chunk: Buffer) => {
      errBuf = Buffer.concat([errBuf, chunk]);
      if (errBuf.length > opts.stderrBytes) errBuf = errBuf.subarray(errBuf.length - opts.stderrBytes);
    });

    let spawnError: string | null = null;
    child.on('error', (e) => { spawnError = e.message; });

    child.on('close', (code, sig) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        signal: sig,
        stdout: Buffer.concat(out),
        stderr: errBuf,
        stdoutTruncated,
        timedOut,
        spawnError,
        wallMs: Date.now() - started,
      });
    });

    // a program blocked on stdin must see eof
    child.stdin!.on('error', () => { /* epipe when the child exits early; harmless */ });
    child.stdin!.end(opts.stdin);
  });
}
