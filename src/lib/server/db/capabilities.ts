import { libsqlClient } from './client';

const REQUIRED_FUZZY_FUNCTIONS = ['fuzzy_translit', 'fuzzy_jarowin', 'fuzzy_damlev'];

let capabilitiesCheckPromise: Promise<void> | null = null;

async function verifyFts5Support(): Promise<void> {
  try {
    const result = await libsqlClient.execute(
      `SELECT name FROM pragma_module_list WHERE lower(name) = 'fts5' LIMIT 1`
    );

    const hasFts5 = result.rows.length > 0;
    if (!hasFts5) {
      throw new Error('fts5 module not found in pragma_module_list');
    }
  } catch (error) {
    throw new Error(
      `[db] FTS5 extension is not available. Ensure the local Docker DB is running (pnpm run db:dev) or use a compatible Turso/libSQL backend. Details: ${String(error)}`
    );
  }
}

async function verifyFuzzySupport(): Promise<void> {
  const rows = await libsqlClient.execute({
    sql: `SELECT name FROM pragma_function_list WHERE name IN (${REQUIRED_FUZZY_FUNCTIONS.map(() => '?').join(', ')})`,
    args: REQUIRED_FUZZY_FUNCTIONS
  });

  const available = new Set(
    rows.rows
      .map((row) => {
        const name = (row as { name?: unknown }).name;
        return typeof name === 'string' ? name.toLowerCase() : null;
      })
      .filter((name): name is string => name !== null)
  );

  const missing = REQUIRED_FUZZY_FUNCTIONS.filter((name) => !available.has(name));
  if (missing.length > 0) {
    throw new Error(
      `[db] Missing fuzzy extension functions: ${missing.join(', ')}. Ensure the local Docker DB is running (pnpm run db:dev) or use a compatible Turso/libSQL backend.`
    );
  }
}

async function runCapabilitiesCheck(): Promise<void> {
  await verifyFts5Support();
  await verifyFuzzySupport();
}

export async function ensureDatabaseCapabilities(): Promise<void> {
  capabilitiesCheckPromise ??= runCapabilitiesCheck().catch((error) => {
    capabilitiesCheckPromise = null;
    throw error;
  });

  await capabilitiesCheckPromise;
}
