import { useReducedMotion } from 'motion/react';
import type { Transition } from 'motion/react';

// one place for the springs. apple's two knobs are damping and response;
// motion's `bounce` + `duration` map onto them. everything that just appears
// is critically damped (no overshoot); only motion that inherits a gesture's
// momentum gets a little bounce. a spring has no fixed duration — `duration`
// here is the perceptual response, not a clock.

export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.35 };
export const springSnappy: Transition = { type: 'spring', bounce: 0, duration: 0.25 };
export const springMomentum: Transition = { type: 'spring', bounce: 0.2, duration: 0.4 };

/** enter from just below, settle in place. reduced motion → a plain cross-fade. */
export function useEnter(dy = 8) {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: dy, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: reduce ? { duration: 0.18 } : spring,
  } as const;
}

/** the user's colour scheme, live */
export function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
