import { VERDICT_LABEL, isTerminal, type Terminal } from '@oj/contracts';
import type { SubmissionView } from '../lib/useSubmission';

const tone = (s: string) => (s === 'AC' ? 'good' : s === 'CE' || s === 'OLE' ? '' : isTerminal(s as never) ? 'bad' : 'pending');

export function VerdictChip({ status }: { status: string }) {
  return <span className={`chip ${tone(status)}`}>{status}</span>;
}

export function VerdictPanel({ s }: { s: SubmissionView }) {
  const terminal = isTerminal(s.status);
  return (
    <div className={`verdict ${tone(s.status)}`}>
      <div className="row between">
        <div className="row">
          <VerdictChip status={s.status} />
          <span>{terminal ? VERDICT_LABEL[s.status as Terminal] : s.status === 'QUEUED' ? 'waiting for a judge slot…' : s.status === 'COMPILING' ? 'compiling…' : `running test cases… ${s.passedCount}/${s.totalCount}`}</span>
        </div>
        {terminal && s.status !== 'CE' && (
          <span className="muted mono">
            {s.passedCount}/{s.totalCount} cases{s.timeMs !== null ? ` · ${s.timeMs} ms` : ''}{s.memoryKb ? ` · ${Math.round(s.memoryKb / 1024)} mb` : ''}
          </span>
        )}
      </div>
      {s.status === 'WA' && s.failedTestcaseIdx !== null && <p className="muted">wrong answer on test case {s.failedTestcaseIdx + 1}</p>}
      {(s.status === 'TLE' || s.status === 'MLE' || s.status === 'RE' || s.status === 'OLE') && s.failedTestcaseIdx !== null && <p className="muted">on test case {s.failedTestcaseIdx + 1}</p>}
      {s.status === 'CE' && s.compilerLog && <pre className="out bad">{s.compilerLog}</pre>}
      {s.status === 'RE' && s.stderrTail && <pre className="out bad">{s.stderrTail}</pre>}
      {s.status === 'IE' && <p className="muted">that one is on us, not you. it has been flagged.</p>}
    </div>
  );
}
