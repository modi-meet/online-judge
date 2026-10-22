import { motion } from 'motion/react';
import { VERDICT_LABEL, isTerminal, type Terminal } from '@oj/contracts';
import type { SubmissionView } from '../lib/useSubmission';
import { useEnter } from '../lib/motion';
import { Icon } from './Icon';

const tone = (s: string) => (s === 'AC' ? 'good' : s === 'CE' || s === 'OLE' ? '' : isTerminal(s as never) ? 'bad' : 'pending');

export function VerdictChip({ status }: { status: string }) {
  return <span className={`chip ${tone(status)}`}>{status}</span>;
}

// the panel settles in once; the chip inside re-enters on every status
// change, so the eye is drawn to the thing that changed, not the box.
export function VerdictPanel({ s }: { s: SubmissionView }) {
  const terminal = isTerminal(s.status);
  const enter = useEnter(8);
  const pop = useEnter(0);
  return (
    <motion.div className={`verdict ${tone(s.status)}`} initial={enter.initial} animate={enter.animate} transition={enter.transition}>
      <div className="row between wrap">
        <div className="row">
          <span className={`verdict-icon ${tone(s.status)}`}>
            {s.status === 'AC' ? <Icon name="check-circle" size={22} />
              : !terminal ? <span className="spin" />
              : tone(s.status) === 'bad' ? <Icon name="x-circle" size={22} />
              : <Icon name="alert" size={22} />}
          </span>
          <motion.span key={s.status} initial={pop.initial} animate={pop.animate} transition={pop.transition} style={{ display: 'inline-flex' }}>
            <VerdictChip status={s.status} />
          </motion.span>
          <span>{terminal ? VERDICT_LABEL[s.status as Terminal] : s.status === 'QUEUED' ? 'Waiting for a judge slot…' : s.status === 'COMPILING' ? 'Compiling…' : `Running test cases… ${s.passedCount}/${s.totalCount}`}</span>
        </div>
        {terminal && s.status !== 'CE' && (
          <span className="muted mono">
            {s.passedCount}/{s.totalCount} cases{s.timeMs !== null ? ` · ${s.timeMs} ms` : ''}{s.memoryKb ? ` · ${Math.round(s.memoryKb / 1024)} mb` : ''}
          </span>
        )}
      </div>
      {s.status === 'WA' && s.failedTestcaseIdx !== null && <p className="muted">Wrong answer on test case {s.failedTestcaseIdx + 1}</p>}
      {(s.status === 'TLE' || s.status === 'MLE' || s.status === 'RE' || s.status === 'OLE') && s.failedTestcaseIdx !== null && <p className="muted">On test case {s.failedTestcaseIdx + 1}</p>}
      {s.status === 'CE' && s.compilerLog && <pre className="out bad">{s.compilerLog}</pre>}
      {s.status === 'RE' && s.stderrTail && <pre className="out bad">{s.stderrTail}</pre>}
      {s.status === 'IE' && <p className="muted">That one is on us, not you. It has been flagged.</p>}
    </motion.div>
  );
}
