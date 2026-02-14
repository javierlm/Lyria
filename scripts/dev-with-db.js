#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const isWindows = platform() === 'win32';
const pnpmCommand = isWindows ? 'pnpm.cmd' : 'pnpm';

function run(command, args) {
  return spawn(command, args, {
    stdio: 'inherit',
    shell: false
  });
}

const dbProcess = run(pnpmCommand, ['run', 'db:dev']);
const appProcess = run(pnpmCommand, ['run', 'dev']);

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!dbProcess.killed) {
    dbProcess.kill('SIGTERM');
  }

  if (!appProcess.killed) {
    appProcess.kill('SIGTERM');
  }

  setTimeout(() => process.exit(exitCode), 100);
}

dbProcess.on('exit', (code) => {
  if (shuttingDown) {
    return;
  }

  if (code && code !== 0) {
    console.error(`[dev:full] Database process exited with code ${code}`);
    shutdown(code);
    return;
  }

  console.warn('[dev:full] Database process stopped');
  shutdown(0);
});

appProcess.on('exit', (code) => {
  if (shuttingDown) {
    return;
  }

  if (code && code !== 0) {
    console.error(`[dev:full] App process exited with code ${code}`);
    shutdown(code);
    return;
  }

  console.warn('[dev:full] App process stopped');
  shutdown(0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
