import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const mode = process.env.DATABASE_MODE ?? 'auto';
const isLocal = mode !== 'remote';

const url = isLocal
  ? process.env.DATABASE_LOCAL_URL || 'http://127.0.0.1:8080'
  : process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL is required when DATABASE_MODE=remote');
}

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url,
    authToken: isLocal ? undefined : process.env.DATABASE_AUTH_TOKEN
  }
});
