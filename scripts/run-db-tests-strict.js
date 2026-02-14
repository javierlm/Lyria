#!/usr/bin/env node
import { spawn } from 'node:child_process';

const env = Object.fromEntries(
  Object.entries({
    ...process.env,
    TEST_REQUIRE_FUZZY: '1'
  }).filter(([, value]) => value !== undefined)
);

const child = spawn('pnpm run test:db', {
  stdio: 'inherit',
  env,
  shell: true
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[test:db:strict] Failed to start test process', error);
  process.exit(1);
});
