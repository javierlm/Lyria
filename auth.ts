import { betterAuth } from 'better-auth';
import { createAuthBaseOptions } from './src/lib/server/auth-options';

export const auth = betterAuth(createAuthBaseOptions());

export default auth;
