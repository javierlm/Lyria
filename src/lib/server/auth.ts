import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { createAuthBaseOptions } from './auth-options';

const authEnv = {
  NODE_ENV: env.NODE_ENV ?? process.env.NODE_ENV,
  VERCEL_ENV: env.VERCEL_ENV,
  VERCEL_URL: env.VERCEL_URL ?? process.env.VERCEL_URL,
  BETTER_AUTH_TRUSTED_ORIGINS: env.BETTER_AUTH_TRUSTED_ORIGINS,
  BETTER_AUTH_PREVIEW_URL: env.BETTER_AUTH_PREVIEW_URL,
  BETTER_AUTH_BASE_URL: env.BETTER_AUTH_BASE_URL,
  BETTER_AUTH_URL: env.BETTER_AUTH_URL,
  BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
  GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
  MICROSOFT_CLIENT_ID: env.MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET: env.MICROSOFT_CLIENT_SECRET,
  MICROSOFT_TENANT_ID: env.MICROSOFT_TENANT_ID,
  SPOTIFY_CLIENT_ID: env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: env.SPOTIFY_CLIENT_SECRET
};

const baseOptions = createAuthBaseOptions(authEnv);

export const auth = betterAuth({
  ...baseOptions,
  logger: {
    level: authEnv.NODE_ENV === 'production' ? 'warn' : 'debug'
  },
  plugins: [...baseOptions.plugins, sveltekitCookies(getRequestEvent)]
});
