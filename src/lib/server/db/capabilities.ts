import { libsqlClient } from './client';

const REQUIRED_FUZZY_FUNCTIONS = ['fuzzy_translit', 'fuzzy_jarowin', 'fuzzy_damlev'];

let capabilitiesCheckPromise: Promise<void> | null = null;

async function verifyFts5Support(): Promise<void> {
  try {
    await libsqlClient.execute('CREATE VIRTUAL TABLE temp.__lyria_fts_cap USING fts5(content)');
    await libsqlClient.execute('DROP TABLE IF EXISTS temp.__lyria_fts_cap');
  } catch (error) {
    throw new Error(
      `[db] FTS5 extension is not available. Start local database with Turso/libSQL. Details: ${String(error)}`
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
      `[db] Missing fuzzy extension functions: ${missing.join(', ')}. Start local database with Turso/libSQL (turso dev).`
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
