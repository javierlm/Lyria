import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/client';
import * as authSchema from './db/auth-schema';

export interface AuthEnv {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  BETTER_AUTH_PREVIEW_URL?: string;
  BETTER_AUTH_BASE_URL?: string;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  MICROSOFT_TENANT_ID?: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
}

function getConfiguredBaseUrl(runtimeEnv: AuthEnv): string | undefined {
  const isVercelPreview = runtimeEnv.VERCEL_ENV === 'preview';
  if (isVercelPreview) {
    if (runtimeEnv.BETTER_AUTH_PREVIEW_URL) {
      return runtimeEnv.BETTER_AUTH_PREVIEW_URL;
    }

    if (runtimeEnv.VERCEL_URL) {
      return `https://${runtimeEnv.VERCEL_URL}`;
    }
  }

  return runtimeEnv.BETTER_AUTH_BASE_URL || runtimeEnv.BETTER_AUTH_URL;
}

function getStaticTrustedOrigins(runtimeEnv: AuthEnv): string[] {
  const origins = new Set<string>();
  const configuredTrustedOrigins = runtimeEnv.BETTER_AUTH_TRUSTED_ORIGINS;

  if (configuredTrustedOrigins) {
    for (const origin of configuredTrustedOrigins.split(',')) {
      const trimmedOrigin = origin.trim();
      if (trimmedOrigin) {
        origins.add(trimmedOrigin);
      }
    }
  }

  const configuredBaseUrl = getConfiguredBaseUrl(runtimeEnv);
  if (configuredBaseUrl) {
    origins.add(configuredBaseUrl);
  }

  if (runtimeEnv.VERCEL_URL) {
    origins.add(`https://${runtimeEnv.VERCEL_URL}`);
  }

  const isDevelopment = runtimeEnv.NODE_ENV !== 'production';
  if (isDevelopment) {
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:5173');
  }

  return Array.from(origins);
}

function getAuthSecret(runtimeEnv: AuthEnv): string {
  const secret = runtimeEnv.BETTER_AUTH_SECRET;
  if (secret) {
    return secret;
  }

  const isDevelopment = runtimeEnv.NODE_ENV !== 'production';
  if (isDevelopment) {
    return 'development-only-secret-change-this-immediately-1234';
  }

  throw new Error('BETTER_AUTH_SECRET is required in non-development environments');
}

function getAuthBaseUrl(runtimeEnv: AuthEnv): string | undefined {
  const baseUrl = getConfiguredBaseUrl(runtimeEnv);
  if (baseUrl) {
    return baseUrl;
  }

  // Fallback for Vercel preview deployments
  if (runtimeEnv.VERCEL_URL) {
    return `https://${runtimeEnv.VERCEL_URL}`;
  }

  return undefined;
}

export function createAuthBaseOptions(runtimeEnv: AuthEnv) {
  const baseURL = getAuthBaseUrl(runtimeEnv);

  return {
    appName: 'Lyria',
    ...(baseURL ? { baseURL } : {}),
    secret: getAuthSecret(runtimeEnv),
    trustedOrigins: (request?: Request) => {
      const origins = new Set(getStaticTrustedOrigins(runtimeEnv));

      if (request) {
        try {
          origins.add(new URL(request.url).origin);
        } catch {
          /* empty */
        }
      }

      return Array.from(origins);
    },
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema
    }),
    emailAndPassword: {
      enabled: true
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', 'microsoft', 'spotify']
      }
    },
    advanced: {
      trustedProxyHeaders: true
    },
    socialProviders: {
      ...(runtimeEnv.GOOGLE_CLIENT_ID && runtimeEnv.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: runtimeEnv.GOOGLE_CLIENT_ID,
              clientSecret: runtimeEnv.GOOGLE_CLIENT_SECRET
            }
          }
        : {}),
      ...(runtimeEnv.MICROSOFT_CLIENT_ID && runtimeEnv.MICROSOFT_CLIENT_SECRET
        ? {
            microsoft: {
              clientId: runtimeEnv.MICROSOFT_CLIENT_ID,
              clientSecret: runtimeEnv.MICROSOFT_CLIENT_SECRET
            }
          }
        : {}),
      ...(runtimeEnv.SPOTIFY_CLIENT_ID && runtimeEnv.SPOTIFY_CLIENT_SECRET
        ? {
            spotify: {
              clientId: runtimeEnv.SPOTIFY_CLIENT_ID,
              clientSecret: runtimeEnv.SPOTIFY_CLIENT_SECRET,
              scopes: [
                'user-read-private',
                'playlist-read-private',
                'playlist-modify-public',
                'playlist-modify-private',
                'user-read-email'
              ]
            }
          }
        : {})
    },
    plugins: []
  };
}
