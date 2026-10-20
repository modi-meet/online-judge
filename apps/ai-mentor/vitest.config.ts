import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkg = (name: string) => fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: { alias: { '@oj/contracts': pkg('contracts'), '@oj/db': pkg('db'), '@oj/sandbox': pkg('sandbox'), '@oj/mentor': pkg('mentor'), '@oj/telemetry': pkg('telemetry') } },
  test: { include: ['test/**/*.test.ts'], testTimeout: 60_000, hookTimeout: 60_000, fileParallelism: false },
});
