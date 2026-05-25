const BEARER_TOKEN_STORAGE_KEY = 'lyria:auth:bearer-token';

export const authBaseUrl =
  (import.meta.env.PUBLIC_AUTH_BASE_URL as string | undefined)?.trim() || undefined;

export const authTransport =
  ((import.meta.env.PUBLIC_AUTH_TRANSPORT as string | undefined)?.trim().toLowerCase() as
    | 'cookie'
    | 'bearer'
    | undefined) || 'cookie';

export const isBearerAuthTransport = authTransport === 'bearer';

export function getStoredBearerToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(BEARER_TOKEN_STORAGE_KEY) || '';
}

export function setStoredBearerToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!token) {
    clearStoredBearerToken();
    return;
  }

  window.localStorage.setItem(BEARER_TOKEN_STORAGE_KEY, token);
}

export function clearStoredBearerToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(BEARER_TOKEN_STORAGE_KEY);
}
