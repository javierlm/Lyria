import { extractVideoId } from '$lib/utils';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const urlParam = url.searchParams.get('url');
	const offsetParam = url.searchParams.get('offset');

	const videoId = urlParam ? extractVideoId(urlParam) : null;
	const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

	return {
		videoId,
		offset: isNaN(offset) ? 0 : offset
	};
};
