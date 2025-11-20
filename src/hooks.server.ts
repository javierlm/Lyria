import { detectLocale } from '$i18n/i18n-util';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const lang = event.cookies.get('lang');

	const locale = detectLocale(
		() => (lang ? [lang] : []),
		() => event.request.headers.get('accept-language')?.split(',') ?? []
	);

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale)
	});
};
