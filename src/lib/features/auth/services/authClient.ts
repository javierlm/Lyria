import { createAuthClient } from 'better-auth/svelte';
import {
  authBaseUrl,
  clearStoredBearerToken,
  getStoredBearerToken,
  isBearerAuthTransport,
  setStoredBearerToken
} from './authRuntime';

export const authClient = createAuthClient({
  ...(authBaseUrl ? { baseURL: authBaseUrl } : {}),
  fetchOptions: {
    ...(isBearerAuthTransport
      ? {
          auth: {
            type: 'Bearer' as const,
            token: () => getStoredBearerToken()
          }
        }
      : {}),
    onSuccess: (ctx) => {
      if (!isBearerAuthTransport) {
        return;
      }

      const authToken = ctx.response.headers.get('set-auth-token');
      if (authToken) {
        setStoredBearerToken(authToken);
      }

      if (ctx.response.url.includes('/sign-out') || ctx.response.url.includes('/signout')) {
        clearStoredBearerToken();
      }
    }
  }
});

export { clearStoredBearerToken, isBearerAuthTransport };
