import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@libsql/client';

const TEST_DB_PORT = Number(process.env.TEST_DB_PORT ?? '8091');
const TEST_DB_FILE = process.env.TEST_DB_FILE ?? 'local.test.db';
const TEST_DB_URL = `http://127.0.0.1:${TEST_DB_PORT}`;
const TEST_DB_RUNTIME = process.env.TEST_DB_RUNTIME ?? 'turso';

function cleanupTestDbFiles(dbFilePath: string): void {
  const suffixes = ['', '-wal', '-shm', '-journal'];

  for (const suffix of suffixes) {
    const filePath = `${dbFilePath}${suffix}`;
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true, recursive: true });
    }
  }
}

async function waitForDatabase(url: string): Promise<void> {
  const client = createClient({ url });
  const maxAttempts = 40;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await client.execute('SELECT 1');
      return;
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    }
  }

  throw new Error('[test-db] Timed out waiting for local Turso dev server');
}

async function applyBaseMigration(url: string): Promise<void> {
  const migrationFiles = readdirSync(resolve('drizzle'))
    .filter((fileName) => /^\d+_.*\.sql$/.test(fileName))
    .sort((left, right) => left.localeCompare(right));

  const client = createClient({ url });

  for (const migrationFile of migrationFiles) {
    const migrationPath = resolve(`drizzle/${migrationFile}`);
    const migrationSql = readFileSync(migrationPath, 'utf8');
    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      await client.execute(statement);
    }
  }
}

export default async function setup(): Promise<() => Promise<void>> {
  const dbFilePath = resolve(TEST_DB_FILE);

  cleanupTestDbFiles(dbFilePath);

  process.env.DATABASE_MODE = 'auto';
  process.env.DATABASE_LOCAL_URL = TEST_DB_URL;

  const processEnv = process.env;
  const databaseProcess =
    TEST_DB_RUNTIME === 'sqld'
      ? spawn(
          'sqld',
          [
            '--db-path',
            TEST_DB_FILE,
            '--http-listen-addr',
            `0.0.0.0:${TEST_DB_PORT}`,
            '--no-welcome'
          ],
          {
            stdio: 'pipe',
            env: processEnv
          }
        )
      : spawn(
          process.execPath,
          [
            'scripts/turso-wrapper.js',
            'dev',
            '--db-file',
            TEST_DB_FILE,
            '--port',
            String(TEST_DB_PORT)
          ],
          {
            stdio: 'pipe',
            env: processEnv
          }
        );

  databaseProcess.stdout?.on('data', () => {});
  databaseProcess.stderr?.on('data', () => {});

  await waitForDatabase(TEST_DB_URL);
  await applyBaseMigration(TEST_DB_URL);

  return async () => {
    if (!databaseProcess.killed) {
      databaseProcess.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveExit) => databaseProcess.once('exit', resolveExit)),
        new Promise((resolveTimeout) => setTimeout(resolveTimeout, 1500))
      ]);

      if (!databaseProcess.killed) {
        databaseProcess.kill('SIGKILL');
      }
    }

    cleanupTestDbFiles(dbFilePath);
  };
}
