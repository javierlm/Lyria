import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

const DEFAULT_LOCAL_LIBSQL_URL = 'http://127.0.0.1:8080';
const runtimeEnv = process.env;

function resolveDatabaseUrl(): string {
  const mode = runtimeEnv.DATABASE_MODE ?? env.DATABASE_MODE ?? 'auto';

  if (dev && mode !== 'remote') {
    return runtimeEnv.DATABASE_LOCAL_URL ?? env.DATABASE_LOCAL_URL ?? DEFAULT_LOCAL_LIBSQL_URL;
  }

  const remoteUrl = runtimeEnv.DATABASE_URL ?? env.DATABASE_URL;
  if (!remoteUrl) {
    throw new Error('DATABASE_URL is required when using remote database mode');
  }

  return remoteUrl;
}

const databaseUrl = resolveDatabaseUrl();
const mode = runtimeEnv.DATABASE_MODE ?? env.DATABASE_MODE ?? 'auto';
const shouldUseAuthToken = !(dev && mode !== 'remote');

export const libsqlClient = createClient({
  url: databaseUrl,
  authToken: shouldUseAuthToken
    ? (runtimeEnv.DATABASE_AUTH_TOKEN ?? env.DATABASE_AUTH_TOKEN)
    : undefined
});

export const db = drizzle({ client: libsqlClient });
