import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const idParam = url.searchParams.get('id');
	const offsetParam = url.searchParams.get('offset');

	const videoId = idParam;
	const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

	return {
		videoId,
		offset: isNaN(offset) ? 0 : offset
	};
};
