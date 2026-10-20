import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// tests run workspace packages from source. this sidesteps vite resolving a
// package's own deps from the symlink path, and means no build step before test.
const pkg = (name: string) => fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: { alias: { '@oj/contracts': pkg('contracts'), '@oj/db': pkg('db'), '@oj/sandbox': pkg('sandbox'), '@oj/judge': pkg('judge'), '@oj/queue': pkg('queue'), '@oj/storage': pkg('storage'), '@oj/events': pkg('events') } },
  test: { include: ['test/**/*.test.ts'], testTimeout: 90_000, fileParallelism: false },
});
