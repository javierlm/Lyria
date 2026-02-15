import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { genericOAuth } from 'better-auth/plugins/generic-oauth';
import { db } from './db/client';
import * as authSchema from './db/auth-schema';

interface DeezerUserProfile {
  id: number;
  name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  picture?: string;
  picture_medium?: string;
  error?: {
    message?: string;
  };
}

const runtimeEnv = process.env;
const isDevelopment = runtimeEnv.NODE_ENV !== 'production';

function getStaticTrustedOrigins(): string[] {
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

  const configuredBaseUrl = runtimeEnv.BETTER_AUTH_BASE_URL || runtimeEnv.BETTER_AUTH_URL;
  if (configuredBaseUrl) {
    origins.add(configuredBaseUrl);
  }

  if (runtimeEnv.VERCEL_URL) {
    origins.add(`https://${runtimeEnv.VERCEL_URL}`);
  }

  if (isDevelopment) {
    origins.add('http://localhost:5173');
  }

  return Array.from(origins);
}

function getAuthSecret(): string {
  const secret = runtimeEnv.BETTER_AUTH_SECRET;
  if (secret) {
    return secret;
  }

  if (isDevelopment) {
    return 'development-only-secret-change-this-immediately-1234';
  }

  throw new Error('BETTER_AUTH_SECRET is required in non-development environments');
}

function getAuthBaseUrl(): string {
  const baseUrl = runtimeEnv.BETTER_AUTH_BASE_URL || runtimeEnv.BETTER_AUTH_URL;
  if (baseUrl) {
    return baseUrl;
  }

  // Fallback for Vercel preview deployments
  if (runtimeEnv.VERCEL_URL) {
    return `https://${runtimeEnv.VERCEL_URL}`;
  }

  if (isDevelopment) {
    return 'http://localhost:5173';
  }

  throw new Error(
    'BETTER_AUTH_BASE_URL (or BETTER_AUTH_URL) is required in non-development environments'
  );
}

export function createAuthBaseOptions() {
  const deezerClientId = runtimeEnv.DEEZER_CLIENT_ID ?? '';
  const deezerClientSecret = runtimeEnv.DEEZER_CLIENT_SECRET ?? '';

  return {
    appName: 'Lyria',
    baseURL: getAuthBaseUrl(),
    secret: getAuthSecret(),
    trustedOrigins: (request?: Request) => {
      const origins = new Set(getStaticTrustedOrigins());

      if (request) {
        try {
          origins.add(new URL(request.url).origin);
        } catch {}
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
              clientSecret: runtimeEnv.MICROSOFT_CLIENT_SECRET,
              tenantId: runtimeEnv.MICROSOFT_TENANT_ID || 'common',
              authority: 'https://login.microsoftonline.com',
              prompt: 'select_account' as const
            }
          }
        : {}),
      ...(runtimeEnv.SPOTIFY_CLIENT_ID && runtimeEnv.SPOTIFY_CLIENT_SECRET
        ? {
            spotify: {
              clientId: runtimeEnv.SPOTIFY_CLIENT_ID,
              clientSecret: runtimeEnv.SPOTIFY_CLIENT_SECRET
            }
          }
        : {})
    },
    plugins: [
      ...(deezerClientId && deezerClientSecret
        ? [
            genericOAuth({
              config: [
                {
                  providerId: 'deezer',
                  clientId: deezerClientId,
                  clientSecret: deezerClientSecret,
                  authorizationUrl: 'https://connect.deezer.com/oauth/auth.php',
                  tokenUrl: 'https://connect.deezer.com/oauth/access_token.php',
                  userInfoUrl: 'https://api.deezer.com/user/me',
                  scopes: ['basic_access', 'email'],
                  getToken: async ({ code, redirectURI }) => {
                    const safeCode = code ?? '';
                    const safeRedirectUri = redirectURI ?? '';
                    const tokenResponse = await fetch(
                      `https://connect.deezer.com/oauth/access_token.php?app_id=${encodeURIComponent(deezerClientId)}&secret=${encodeURIComponent(deezerClientSecret)}&code=${encodeURIComponent(safeCode)}&output=json&redirect_uri=${encodeURIComponent(safeRedirectUri)}`,
                      {
                        method: 'GET'
                      }
                    );

                    if (!tokenResponse.ok) {
                      throw new Error('Failed to exchange Deezer authorization code');
                    }

                    const payload = (await tokenResponse.json()) as {
                      access_token?: string;
                      expires?: number;
                    };

                    if (!payload.access_token) {
                      throw new Error('Deezer token response does not contain an access token');
                    }

                    return {
                      accessToken: payload.access_token,
                      accessTokenExpiresAt: payload.expires
                        ? new Date(Date.now() + payload.expires * 1000)
                        : undefined,
                      scopes: ['basic_access', 'email'],
                      raw: payload
                    };
                  },
                  getUserInfo: async (tokens) => {
                    const accessToken = tokens.accessToken ?? '';
                    const response = await fetch(
                      `https://api.deezer.com/user/me?access_token=${encodeURIComponent(accessToken)}`
                    );

                    if (!response.ok) {
                      return null;
                    }

                    const profile = (await response.json()) as DeezerUserProfile;

                    if (!profile.id || profile.error) {
                      return null;
                    }

                    const fallbackName = [profile.firstname, profile.lastname]
                      .filter(Boolean)
                      .join(' ');

                    return {
                      id: String(profile.id),
                      name: profile.name || fallbackName || `Deezer User ${profile.id}`,
                      email: profile.email ?? `deezer-${profile.id}@users.lyria.local`,
                      image: profile.picture_medium ?? profile.picture,
                      emailVerified: Boolean(profile.email)
                    };
                  }
                }
              ]
            })
          ]
        : [])
    ]
  };
}
