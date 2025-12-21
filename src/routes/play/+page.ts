import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const idParam = url.searchParams.get('id');
	const offsetParam = url.searchParams.get('offset');

	const videoId = idParam;
	const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
	const lyricId = url.searchParams.get('lyricId');

	return {
		videoId,
		offset: isNaN(offset) ? 0 : offset,
		lyricId: lyricId ? parseInt(lyricId, 10) : null
	};
};
