import {
  authBaseUrl,
  getStoredBearerToken,
  isBearerAuthTransport
} from '$lib/features/auth/services/authRuntime';

const configuredApiBaseUrl =
  (import.meta.env.PUBLIC_API_BASE_URL as string | undefined)?.trim() || authBaseUrl || '';

export function buildApiUrl(path: string): string {
  if (!configuredApiBaseUrl) {
    return path;
  }

  const normalizedBaseUrl = configuredApiBaseUrl.endsWith('/')
    ? configuredApiBaseUrl.slice(0, -1)
    : configuredApiBaseUrl;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  extraHeaders: HeadersInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});

  for (const [key, value] of new Headers(extraHeaders).entries()) {
    headers.set(key, value);
  }

  if (isBearerAuthTransport) {
    const token = getStoredBearerToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: init.credentials ?? 'include'
  });
}
