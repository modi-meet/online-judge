// lld §11.5. runs on the complete response before a token reaches the client
// for buffered modes, and per completed code block for streaming ones. false
// positives are cheap; a leaked solution is not.

export interface GuardVerdict {
  blocked: boolean;
  rule: 'A' | 'B' | 'C' | null;
}

const FENCE = /```([\w+-]*)\n([\s\S]*?)```/g;
const LOOP_OR_RECURSION = /\b(for|while|def|function|int\s+\w+\s*\(|void\s+\w+\s*\(|auto\s+\w+\s*\()\b/;
const RESULT_OUT = /\b(return|print|cout|console\.log|System\.out|printf|puts|write)\b/;
const LANG_ALIASES: Record<string, string[]> = {
  cpp17: ['cpp', 'c++', 'cxx'], c: ['c'], python3: ['python', 'py', 'python3'], java17: ['java'], node20: ['js', 'javascript', 'node', 'typescript', 'ts'],
};

const nonComment = (code: string) => code.split('\n').filter((l) => l.trim() && !/^\s*(\/\/|#|\*|\/\*)/.test(l));

/**
 * rule a: a fenced block that looks like a complete solution — long enough,
 * has control flow, produces a result, and is in the user's language.
 * rule b: near-duplicate of an editorial (identifier-stripped 4-gram jaccard).
 * rule c: the response reuses most of an editorial's identifiers.
 */
export function leakGuard(response: string, opts: { language: string; editorials?: string[] }): GuardVerdict {
  const aliases = new Set([opts.language, ...(LANG_ALIASES[opts.language] ?? [])]);
  for (const m of response.matchAll(FENCE)) {
    const lang = (m[1] ?? '').toLowerCase();
    const body = m[2] ?? '';
    const lines = nonComment(body);
    const langMatches = lang === '' || aliases.has(lang);
    if (lines.length >= 8 && LOOP_OR_RECURSION.test(body) && RESULT_OUT.test(body) && langMatches) return { blocked: true, rule: 'A' };
  }
  for (const ed of opts.editorials ?? []) {
    if (jaccard4(normalize(response), normalize(ed)) > 0.75) return { blocked: true, rule: 'B' };
    const ids = identifiers(ed);
    if (ids.size >= 8) {
      const shared = [...ids].filter((i) => response.includes(i)).length;
      if (shared / ids.size > 0.6) return { blocked: true, rule: 'C' };
    }
  }
  return { blocked: false, rule: null };
}

/** strip comments and whitespace, rename identifiers to positional tokens */
export function normalize(code: string) {
  const stripped = code.replace(/\/\/.*|#.*|\/\*[\s\S]*?\*\//g, '');
  const names = new Map<string, string>();
  return stripped.replace(/[A-Za-z_]\w*/g, (w) => {
    if (/^(for|while|if|else|return|int|long|def|print|import|include|using|namespace|std|class|public|static|void|main)$/.test(w)) return w;
    if (!names.has(w)) names.set(w, `v${names.size}`);
    return names.get(w)!;
  }).replace(/\s+/g, ' ').trim();
}

function identifiers(code: string) {
  return new Set((code.match(/[A-Za-z_]\w{2,}/g) ?? []).filter((w) => !/^(for|while|return|int|long|def|print|import|include|using|namespace|std|class|public|static|void|main|cout|cin|endl)$/.test(w)));
}

function jaccard4(a: string, b: string) {
  const grams = (s: string) => { const t = s.split(' '); const g = new Set<string>(); for (let i = 0; i + 4 <= t.length; i++) g.add(t.slice(i, i + 4).join(' ')); return g; };
  const ga = grams(a); const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let inter = 0; for (const g of ga) if (gb.has(g)) inter++;
  return inter / (ga.size + gb.size - inter);
}

export const BLOCKED_REPLY = 'i stopped myself — that reply was about to hand over a working solution. ask me for the next smallest step instead: the invariant, the data structure, or the one line you are unsure about.';
