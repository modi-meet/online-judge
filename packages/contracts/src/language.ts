// languages the judge accepts. adding one is a config entry plus a runner
// dockerfile — never a code change elsewhere. mvp ships cpp, python, java.

export const LANGUAGES = ['cpp17', 'c', 'python3', 'java17', 'node20'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface LanguageSpec {
  /** display name */
  name: string;
  /** file the source is written to inside the sandbox. java forces Main.java */
  file: string;
  /** null for interpreted languages */
  compile: string[] | null;
  run: string[];
  /** runner image, tag pinned per deploy */
  image: string;
  /** monaco language id */
  editor: string;
}

export const LANGUAGE_SPEC: Record<Language, LanguageSpec> = {
  cpp17: {
    name: 'c++17',
    file: 'main.cpp',
    compile: ['g++', '-O2', '-std=c++17', 'main.cpp', '-o', 'main'],
    run: ['./main'],
    image: 'oj/run-cpp',
    editor: 'cpp',
  },
  c: {
    name: 'c',
    file: 'main.c',
    compile: ['gcc', '-O2', 'main.c', '-o', 'main'],
    run: ['./main'],
    image: 'oj/run-cpp',
    editor: 'c',
  },
  python3: {
    name: 'python 3',
    file: 'main.py',
    compile: null,
    run: ['python3', 'main.py'],
    image: 'oj/run-py',
    editor: 'python',
  },
  java17: {
    name: 'java 17',
    file: 'Main.java',
    compile: ['javac', 'Main.java'],
    run: ['java', '-Xss64m', '-XX:+UseSerialGC', 'Main'],
    image: 'oj/run-java',
    editor: 'java',
  },
  node20: {
    name: 'javascript (node 20)',
    file: 'main.js',
    compile: null,
    run: ['node', 'main.js'],
    image: 'oj/run-node',
    editor: 'javascript',
  },
};

export const COMPILE_TIMEOUT_MS = 10_000;
