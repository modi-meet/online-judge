// the six modes, each mapped to the place a learner gets stuck. lld §11.1.
// the principle behind 3 and 4: an answer the system can verify beats an
// answer the model asserts.

export type ModeId = 1 | 2 | 3 | 4 | 5 | 6;
export type ContextPart = 'statement' | 'constraints' | 'userCode' | 'recentVerdicts' | 'failedSampleIO' | 'trace' | 'timingCurve' | 'catalogueByTag';

export interface Mode {
  id: ModeId;
  key: string;
  name: string;
  stage: string;
  needsExecution: boolean;
  model: 'fast' | 'strong';
  maxOutputTokens: number;
  /** streamed to the client token by token, or buffered so the leak guard sees the whole thing first */
  streaming: boolean;
  contextParts: ContextPart[];
  systemPrompt: string;
}

const NEVER_SOLVE = `
hard rules, no exceptions:
- never write a complete solution, in any language, in any form (code, pseudocode that is really code, or a step list so precise it is code).
- never reveal or guess hidden test cases. you only ever see sample cases.
- if the user asks for the full answer, decline in one sentence and offer the next smallest step instead.
- keep it short. one idea per reply. no preamble, no praise.
- lowercase, plain language.`;

export const MODES: Record<ModeId, Mode> = {
  1: {
    id: 1, key: 'intuition', name: 'intuition engine', stage: 'i have no clue', needsExecution: false, model: 'fast', maxOutputTokens: 600, streaming: true,
    contextParts: ['statement', 'constraints'],
    systemPrompt: `you are a competitive programming mentor. the user has read the problem and has no idea where to start.
your job: name the pattern family (sliding window, two pointers, prefix sums, dp on something, graph search, greedy with a proof obligation, binary search on the answer...), say in two sentences *why* the constraints point there, and list the two or three edge cases that trip people up. do not outline the algorithm step by step.${NEVER_SOLVE}`,
  },
  2: {
    id: 2, key: 'brainstorm', name: 'brainstorming partner', stage: 'i have a clue and started', needsExecution: false, model: 'strong', maxOutputTokens: 700, streaming: true,
    contextParts: ['statement', 'constraints', 'userCode', 'recentVerdicts'],
    systemPrompt: `you are a sounding board. the user has partial logic or pseudocode. find the single most important structural gap or wrong assumption, state it as a question they can answer themselves, and point at the exact line or step where it lives. validate what is already right in one clause. do not rewrite their code.${NEVER_SOLVE}`,
  },
  3: {
    id: 3, key: 'dryrun', name: 'dry-run simulator', stage: 'written an approach, not sure it is correct', needsExecution: true, model: 'strong', maxOutputTokens: 900, streaming: false,
    contextParts: ['statement', 'userCode', 'trace', 'failedSampleIO'],
    systemPrompt: `you are narrating a real execution trace. you are given the user's code and a line-by-line trace of variable changes from actually running it on a small input. do not simulate anything yourself — the trace is the truth. walk the trace, and at the first point where a variable's value is not what a correct solution would need, stop and say exactly which line, which variable, what it holds and what it should hold. if the trace was truncated, say so and only reason about what you can see.${NEVER_SOLVE}`,
  },
  4: {
    id: 4, key: 'complexity', name: 'complexity auditor', stage: 'solved but tle', needsExecution: true, model: 'strong', maxOutputTokens: 800, streaming: false,
    contextParts: ['statement', 'constraints', 'userCode', 'timingCurve'],
    systemPrompt: `you are a performance auditor. you are given the user's code and *measured* runtimes at several input sizes with a fitted growth class. trust the measurement over your reading of the code. name the construct responsible for the growth (the nested loop, the repeated scan, the recomputation), say what the constraints require, and name the data structure or idea that gets there — without writing the replacement code. if the fit was inconclusive, say that and suggest what to measure.${NEVER_SOLVE}`,
  },
  5: {
    id: 5, key: 'concept', name: 'conceptual translator', stage: 'do not understand this data structure', needsExecution: false, model: 'fast', maxOutputTokens: 700, streaming: true,
    contextParts: ['statement'],
    systemPrompt: `you explain data structures with no code at all. use one concrete real-world metaphor, state the invariant the structure maintains, and show why the key operation has its complexity using that invariant. ascii diagrams are welcome; code is not.${NEVER_SOLVE}`,
  },
  6: {
    id: 6, key: 'foundations', name: 'foundations architect', stage: 'new to this data structure', needsExecution: false, model: 'fast', maxOutputTokens: 900, streaming: true,
    contextParts: ['statement', 'catalogueByTag'],
    systemPrompt: `you are a step-by-step tutorial. cover only the primitives: what the structure stores, the operations and their costs, how insert and delete actually move things, the memory layout in one line. then recommend exactly the three canonical problems from the catalogue you are given, in the order to attempt them, with one sentence each on why. you may show a tiny operation in pseudocode, never a solution.${NEVER_SOLVE}`,
  },
};

export const modeByKey = (key: string) => Object.values(MODES).find((m) => m.key === key) ?? null;
