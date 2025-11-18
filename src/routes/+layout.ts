import type { LayoutLoad } from './$types';
import { loadLocaleAsync } from '$i18n/i18n-util.async';

export const load: LayoutLoad = async ({ data: { locale } }) => {
	await loadLocaleAsync(locale);
	return { locale };
};
