import type { PageServerLoad } from './$types';
import {
  fetchYouTubeMetadata,
  getYouTubeThumbnailUrl
} from '$lib/features/video/services/youtubeMetadataService';

export const load: PageServerLoad = async ({ url, parent, isDataRequest }) => {
  const id = url.searchParams.get('id');

  // Get locale from layout
  const { locale } = await parent();
  const description = locale === 'es' ? 'Ver en Lyria' : 'Watch on Lyria';

  if (!id) {
    return {
      thumbnailUrl: '',
      videoTitle: '',
      artist: '',
      track: '',
      description
    };
  }

  if (isDataRequest) {
    return {
      thumbnailUrl: getYouTubeThumbnailUrl(id),
      videoTitle: '',
      artist: '',
      track: '',
      description
    };
  }

  const metadata = await fetchYouTubeMetadata(id, { timeoutMs: 2500 });

  return {
    thumbnailUrl: metadata?.thumbnailUrl ?? getYouTubeThumbnailUrl(id),
    videoTitle: metadata?.title ?? '',
    artist: metadata?.artist ?? '',
    track: metadata?.track ?? '',
    description
  };
};
