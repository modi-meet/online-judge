import { beforeAll, describe, expect, it } from 'vitest';
import { HostExecutor } from '../src/index.js';

beforeAll(() => { process.env['ALLOW_HOST_EXECUTOR'] = 'true'; });

describe('host executor guards', () => {
  it('refuses to construct in production', () => {
    const prev = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    expect(() => new HostExecutor()).toThrow(/never run in production/);
    process.env['NODE_ENV'] = prev;
  });
  it('refuses without the explicit flag', () => {
    process.env['ALLOW_HOST_EXECUTOR'] = 'false';
    expect(() => new HostExecutor()).toThrow(/disabled/);
    process.env['ALLOW_HOST_EXECUTOR'] = 'true';
  });
});

describe('host executor runs python', () => {
  const x = () => new HostExecutor();

  it('echoes stdin through stdout', async () => {
    const r = await x().exec({ language: 'python3', code: 'print(int(input()) * 2)', stdin: '21\n' });
    expect(r.outcome).toBe('exited');
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('42\n');
  });

  it('kills an infinite loop at the wall limit', async () => {
    const r = await x().exec({ language: 'python3', code: 'while True: pass', stdin: '', limits: { wallMs: 800 } });
    expect(r.outcome).toBe('timeout');
    expect(r.signal).toBe('SIGKILL');
  });

  it('truncates runaway stdout and marks it', async () => {
    const r = await x().exec({
      language: 'python3', code: 'while True: print("x" * 1000)', stdin: '',
      limits: { stdoutBytes: 10_000, wallMs: 3000 },
    });
    expect(r.stdoutTruncated).toBe(true);
    expect(r.stdout.length).toBeLessThanOrEqual(10_000);
  });

  it('reports a runtime error with the tail of stderr', async () => {
    const r = await x().exec({ language: 'python3', code: 'raise ValueError("boom")', stdin: '' });
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).toContain('boom');
  });

  it('a program blocked on input sees eof instead of hanging', async () => {
    const r = await x().exec({ language: 'python3', code: 'import sys; print(len(sys.stdin.read()))', stdin: '' });
    expect(r.stdout).toBe('0\n');
  });
});

describe('host executor compiles c++', () => {
  it('surfaces a compile error without running', async () => {
    const r = await new HostExecutor().exec({ language: 'cpp17', code: 'int main( { }', stdin: '' });
    expect(r.compileError).toMatch(/error/i);
    expect(r.stdout).toBe('');
  });
  it('compiles and runs', async () => {
    const r = await new HostExecutor().exec({
      language: 'cpp17',
      code: '#include <iostream>\nint main(){long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}',
      stdin: '2 3\n',
    });
    expect(r.compileError).toBeNull();
    expect(r.stdout).toBe('5\n');
  });
});
