#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const isWindows = platform() === 'win32';

// Get command line arguments (excluding node and script path)
const args = process.argv.slice(2);

function escapeForBash(arg) {
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

// Determine the turso command based on platform
const tursoCommand = isWindows ? 'wsl' : 'turso';
const tursoArgs = isWindows
  ? [
      'bash',
      '-lc',
      `if command -v turso >/dev/null 2>&1; then turso ${args.map(escapeForBash).join(' ')}; elif [ -x "$HOME/.turso/turso" ]; then "$HOME/.turso/turso" ${args
        .map(escapeForBash)
        .join(' ')}; else echo "turso CLI was not found in WSL PATH" >&2; exit 127; fi`
    ]
  : args;

// Spawn the turso process
const turso = spawn(tursoCommand, tursoArgs, {
  stdio: 'inherit',
  shell: false
});

// Forward exit code
turso.on('exit', (code) => {
  process.exit(code || 0);
});

// Handle errors
turso.on('error', (err) => {
  console.error('Failed to start turso:', err);
  process.exit(1);
});
