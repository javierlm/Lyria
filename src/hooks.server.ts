import { detectLocale } from '$i18n/i18n-util';
import { auth } from '$lib/server/auth';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const lang = event.cookies.get('lang');

  const locale = detectLocale(
    () => (lang ? [lang] : []),
    () => event.request.headers.get('accept-language')?.split(',') ?? []
  );

  event.locals.locale = locale;

  try {
    const session = await auth.api.getSession({
      headers: event.request.headers
    });

    if (session) {
      event.locals.session = session.session;
      event.locals.user = session.user;
    }
  } catch (error) {
    console.warn('[auth] Session lookup failed, continuing without session', error);
  }

  return svelteKitHandler({
    event,
    resolve: (authEvent) =>
      resolve(authEvent, {
        transformPageChunk: ({ html }) => html.replace('%lang%', locale)
      }),
    auth,
    building
  });
};
