import { getRequestEvent } from '$app/server';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { createAuthBaseOptions } from './auth-options';

const baseOptions = createAuthBaseOptions();

export const auth = betterAuth({
  ...baseOptions,
  plugins: [...baseOptions.plugins, sveltekitCookies(getRequestEvent)]
});
