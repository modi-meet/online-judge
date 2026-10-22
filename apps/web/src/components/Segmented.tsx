import { motion } from 'motion/react';
import { springSnappy } from '../lib/motion';

// a segmented control: one thumb that slides between options with a spring.
// the thumb is a shared-layout element, so switching mid-animation re-targets
// from wherever it is rather than restarting — interruptible by construction.
export function Segmented<T extends string>(p: { name: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className={`seg ${p.size ?? 'md'}`} role="tablist">
      {p.options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === p.value} className={o.value === p.value ? 'on' : ''} onPointerDown={() => p.onChange(o.value)} onClick={() => p.onChange(o.value)}>
          {o.value === p.value && <motion.span layoutId={`seg-thumb-${p.name}`} className="thumb" transition={springSnappy} />}
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
