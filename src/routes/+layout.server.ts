import { detectLocale } from '$i18n/i18n-util';
import { loadLocale } from '$i18n/i18n-util.sync';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request, cookies, locals }) => {
  const lang = cookies.get('lang');

  const locale = detectLocale(
    () => (lang ? [lang] : []),
    () => request.headers.get('accept-language')?.split(',') ?? []
  );

  loadLocale(locale);

  return {
    locale,
    session: locals.session,
    user: locals.user
  };
};
