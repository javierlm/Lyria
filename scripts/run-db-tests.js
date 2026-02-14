#!/usr/bin/env node
import { spawn } from 'node:child_process';

const watchMode = process.argv.includes('--watch');

const env = Object.fromEntries(
  Object.entries({
    ...process.env,
    DATABASE_MODE: process.env.DATABASE_MODE ?? 'auto',
    DATABASE_LOCAL_URL: process.env.DATABASE_LOCAL_URL ?? 'http://127.0.0.1:8091',
    TEST_DB_PORT: process.env.TEST_DB_PORT ?? '8091',
    TEST_DB_FILE: process.env.TEST_DB_FILE ?? 'local.test.db'
  }).filter(([, value]) => value !== undefined)
);

const command = watchMode
  ? 'pnpm exec vitest --config vitest.db.config.ts'
  : 'pnpm exec vitest run --config vitest.db.config.ts';

const child = spawn(command, {
  stdio: 'inherit',
  env,
  shell: true
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[test:db] Failed to start Vitest process', error);
  process.exit(1);
});
