import type { PageLoad } from './$types';

export const load: PageLoad = ({ url, data }) => {
  const idParam = url.searchParams.get('id');
  const offsetParam = url.searchParams.get('offset');

  const videoId = idParam;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
  const lyricId = url.searchParams.get('lyricId');

  return {
    videoId,
    offset: isNaN(offset) ? 0 : offset,
    lyricId: lyricId ? parseInt(lyricId, 10) : null,
    thumbnailUrl: data?.thumbnailUrl,
    videoTitle: data?.videoTitle,
    artist: data?.artist,
    track: data?.track,
    description: data?.description
  };
};
