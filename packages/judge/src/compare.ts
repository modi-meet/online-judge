// the single largest source of "the judge is broken" reports. specified exactly
// in lld §7.3; every row of its edge-case table is a test.

export type CheckerType = 'exact' | 'trim' | 'float' | 'custom';

const normalizeNewlines = (s: string) => s.replace(/\r\n?/g, '\n');

/** byte-for-byte. no normalization at all. */
export const exact = (actual: string, expected: string) => actual === expected;

/** the default: crlf → lf, rstrip each line, drop trailing blank lines. */
export function trim(actual: string, expected: string): boolean {
  const lines = (s: string) => {
    const ls = normalizeNewlines(s).split('\n').map((l) => l.replace(/[ \t]+$/, ''));
    while (ls.length && ls[ls.length - 1] === '') ls.pop();
    return ls;
  };
  const a = lines(actual);
  const b = lines(expected);
  return a.length === b.length && a.every((l, i) => l === b[i]);
}

/** tokenwise; numeric tokens within eps (absolute or relative), others as strings. */
export function float(actual: string, expected: string, eps = 1e-6): boolean {
  const ta = actual.split(/\s+/).filter(Boolean);
  const tb = expected.split(/\s+/).filter(Boolean);
  if (ta.length !== tb.length) return false;
  return ta.every((x, i) => {
    const y = tb[i]!;
    const fx = Number(x);
    const fy = Number(y);
    if (x !== '' && y !== '' && Number.isFinite(fx) && Number.isFinite(fy)) {
      const d = Math.abs(fx - fy);
      return d <= eps || d / Math.max(1, Math.abs(fy)) <= eps;
    }
    return x === y;
  });
}

export function compare(type: CheckerType, actual: string, expected: string, eps?: number): boolean {
  switch (type) {
    case 'exact': return exact(actual, expected);
    case 'float': return float(actual, expected, eps);
    case 'custom': throw new Error('custom checkers run in the worker, not here');
    default: return trim(actual, expected);
  }
}
