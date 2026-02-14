import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/lib/tests/server/**/*.integration.test.ts'],
    globalSetup: ['./src/lib/tests/server/dbGlobalSetup.ts'],
    setupFiles: ['./src/lib/tests/server/dbTestEnvSetup.ts'],
    env: {
      DATABASE_MODE: 'auto',
      DATABASE_LOCAL_URL: 'http://127.0.0.1:8091'
    },
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 60000
  }
});
