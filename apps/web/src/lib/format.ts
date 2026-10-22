const TAGS: Record<string, string> = {
  dp: 'DP', io: 'I/O', kadane: "Kadane's algorithm", 'two-pointers': 'Two pointers', 'binary-search': 'Binary search',
  'matrix-exponentiation': 'Matrix exponentiation',
};

/** tags are stored as lowercase slugs; this is how they read on screen */
export function tagLabel(t: string) {
  const known = TAGS[t];
  if (known) return known;
  const s = t.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
