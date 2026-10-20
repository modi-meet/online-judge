import type { Executor } from '@oj/sandbox';
import type { Language } from '@oj/contracts';
import type { Sample } from '../context.js';

// mode 3. the model narrates a trace that really happened instead of
// pretending to execute code in its head. python only in v3: sys.settrace
// gives line-level variable deltas for free. other languages get the sample
// run (stdout vs expected) and the model is told the trace is unavailable.

const MAX_EVENTS = 250;
const MAX_REPR = 80;

const HARNESS = `
import sys, io, json
_src = open('main.py').read()
_events = []
_prev = {}
_count = [0]
def _r(v):
    try:
        s = repr(v)
    except Exception:
        s = '<unrepr>'
    return s if len(s) <= ${MAX_REPR} else s[:${MAX_REPR}] + '…'
def _tr(frame, event, arg):
    if frame.f_code.co_filename != '<user>':
        return None
    if event == 'line':
        _count[0] += 1
        if _count[0] > ${MAX_EVENTS}:
            sys.settrace(None)
            _events.append('… trace truncated after ${MAX_EVENTS} lines')
            return None
        loc = {k: _r(v) for k, v in frame.f_locals.items() if not k.startswith('__') and not callable(v)}
        changed = {k: v for k, v in loc.items() if _prev.get((frame.f_code.co_name, k)) != v}
        for k, v in loc.items():
            _prev[(frame.f_code.co_name, k)] = v
        if changed:
            _events.append(f"L{frame.f_lineno} {frame.f_code.co_name}: " + ', '.join(f"{k}={v}" for k, v in changed.items()))
    elif event == 'return':
        # a line event only shows what the previous line changed, so the last
        # assignment in a function would otherwise never be seen
        loc = {k: _r(v) for k, v in frame.f_locals.items() if not k.startswith('__') and not callable(v)}
        changed = {k: v for k, v in loc.items() if _prev.get((frame.f_code.co_name, k)) != v}
        if changed or frame.f_code.co_name != '<module>':
            _events.append(f"L{frame.f_lineno} {frame.f_code.co_name} returns {_r(arg)}" + (': ' + ', '.join(f"{k}={v}" for k, v in changed.items()) if changed else ''))
    return _tr
_code = compile(_src, '<user>', 'exec')
_g = {'__name__': '__main__'}
sys.settrace(_tr)
try:
    exec(_code, _g)
except SystemExit:
    pass
except Exception as e:
    _events.append(f"raised {type(e).__name__}: {e}")
finally:
    sys.settrace(None)
sys.stdout.flush()
sys.stderr.write('\\n__OJ_TRACE__\\n' + '\\n'.join(_events) + '\\n__OJ_TRACE_END__\\n')
`;

export interface TraceResult { trace: string | null; sampleRun: string }

export async function traceOnSample(executor: Executor, language: Language, code: string, sample: Sample): Promise<TraceResult> {
  if (language !== 'python3') {
    const r = await executor.exec({ language, code, stdin: sample.input, limits: { cpuMs: 2000, wallMs: 5000 } });
    return { trace: null, sampleRun: describeRun(sample, r.compileError ?? r.stdout, r.stderr, r.exitCode) };
  }
  // main.py becomes the harness with the user's source embedded; the
  // harness compiles it under the '<user>' filename so the tracer can tell
  // the learner's lines from its own.
  const r2 = await executor.exec({ language: 'python3', code: harnessed(code), stdin: sample.input, limits: { cpuMs: 3000, wallMs: 6000 } });
  const m = /__OJ_TRACE__\n([\s\S]*?)\n__OJ_TRACE_END__/.exec(r2.stderr);
  const trace = m ? m[1]! : null;
  const stderr = r2.stderr.replace(/\n?__OJ_TRACE__[\s\S]*$/, '');
  return { trace, sampleRun: describeRun(sample, r2.stdout, stderr, r2.exitCode) };
}

/** main.py = harness + the user's source embedded as a string literal */
export function harnessed(code: string) {
  return HARNESS.replace("open('main.py').read()", JSON.stringify(code));
}

function describeRun(sample: Sample, stdout: string, stderr: string, exitCode: number | null) {
  const ok = stdout.trimEnd() === sample.output.trimEnd();
  return [
    `input:\n${sample.input.trimEnd()}`,
    `expected output:\n${sample.output.trimEnd()}`,
    `actual output:\n${stdout.trimEnd() || '(empty)'}`,
    `verdict on this sample: ${ok ? 'matches' : 'differs'}${exitCode ? ` (exit ${exitCode})` : ''}`,
    stderr.trim() ? `stderr:\n${stderr.trim().slice(-600)}` : '',
  ].filter(Boolean).join('\n\n');
}
