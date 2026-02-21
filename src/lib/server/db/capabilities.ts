import { libsqlClient } from './client';

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

async function runCapabilitiesCheck(): Promise<void> {
  await verifyFts5Support();
}

export async function ensureDatabaseCapabilities(): Promise<void> {
  capabilitiesCheckPromise ??= runCapabilitiesCheck().catch((error) => {
    capabilitiesCheckPromise = null;
    throw error;
  });

  await capabilitiesCheckPromise;
}
