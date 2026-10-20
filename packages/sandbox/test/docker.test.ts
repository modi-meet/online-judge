import { describe, expect, it } from 'vitest';
import { DockerExecutor } from '../src/index.js';

// needs the runner images: ./runners/build.sh dev
const x = new DockerExecutor({ imageTag: process.env['SANDBOX_IMAGE_TAG'] ?? 'dev' });

describe('docker executor', () => {
  it('runs python with stdin and reports cpu time and memory', async () => {
    const r = await x.exec({ language: 'python3', code: 'print(int(input()) * 2)', stdin: '21\n' });
    expect(r.outcome).toBe('exited');
    expect(r.stdout).toBe('42\n');
    expect(r.exitCode).toBe(0);
    expect(r.cpuMs).toBeGreaterThanOrEqual(0);
    expect(r.peakMemKb).toBeGreaterThan(1000);
    expect(r.stderr).toBe('');
  });

  it('compiles and runs c++', async () => {
    const r = await x.exec({ language: 'cpp17', code: '#include <iostream>\nint main(){long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}', stdin: '2 3\n' });
    expect(r.compileError).toBeNull();
    expect(r.stdout).toBe('5\n');
  });

  it('surfaces a compile error', async () => {
    const r = await x.exec({ language: 'cpp17', code: 'int main( {', stdin: '' });
    expect(r.compileError).toMatch(/error/);
  });

  it('a busy loop is a timeout on cpu time', async () => {
    const r = await x.exec({ language: 'python3', code: 'while True: pass', stdin: '', limits: { cpuMs: 500, wallMs: 1500 } });
    expect(r.outcome).toBe('timeout');
  });

  it('a 1 gb allocation is oom', async () => {
    const r = await x.exec({ language: 'python3', code: 'x = bytearray(1024*1024*1024); print(len(x))', stdin: '', limits: { memoryMb: 64 } });
    expect(r.outcome).toBe('oom');
    expect(r.stdout).toBe('');
  });

  it('a fork bomb dies at the pid limit instead of taking the host', async () => {
    const r = await x.exec({ language: 'python3', code: 'import os\nwhile True:\n    os.fork()', stdin: '', limits: { wallMs: 4000 } });
    expect(['exited', 'timeout']).toContain(r.outcome);
    expect(r.stdout).toBe('');
  });

  it('a segfault is a runtime error with the signal name', async () => {
    const r = await x.exec({ language: 'cpp17', code: 'int main(){int*p=0;return *p;}', stdin: '' });
    expect(r.signal).toBe('SIGSEGV');
  });

  it('network is unreachable', async () => {
    const r = await x.exec({ language: 'python3', code: 'import socket\ns=socket.socket()\ns.settimeout(2)\ntry:\n    s.connect(("1.1.1.1",80)); print("open")\nexcept Exception as e:\n    print("blocked")', stdin: '' });
    expect(r.stdout).toBe('blocked\n');
  });

  it('the rootfs and scratch dir are read-only during a run', async () => {
    const r = await x.exec({ language: 'python3', code: 'import os\nfor p in ["/box/x","/etc/x","/usr/x"]:\n    try:\n        open(p,"w").write("1"); print("wrote",p)\n    except Exception:\n        print("denied",p)', stdin: '' });
    expect(r.stdout).toBe('denied /box/x\ndenied /etc/x\ndenied /usr/x\n');
  });

  it('runaway output is truncated', async () => {
    const r = await x.exec({ language: 'python3', code: 'while True: print("x"*1000)', stdin: '', limits: { stdoutBytes: 20_000, wallMs: 4000 } });
    expect(r.stdoutTruncated).toBe(true);
  });

  it('java forces Main.java', async () => {
    const r = await x.exec({ language: 'java17', code: 'import java.util.*;public class Main{public static void main(String[] a){Scanner s=new Scanner(System.in);System.out.println(s.nextInt()+s.nextInt());}}', stdin: '4 5\n' });
    expect(r.compileError).toBeNull();
    expect(r.stdout).toBe('9\n');
  });
});
