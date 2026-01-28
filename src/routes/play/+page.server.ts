import type { PageServerLoad } from './$types';
import { parseTitle } from '$lib/shared/utils';

export const load: PageServerLoad = async ({ url, parent }) => {
  const id = url.searchParams.get('id');
  let thumbnailUrl = '';
  let videoTitle = '';
  let artist = '';
  let track = '';

  if (id) {
    // Check thumbnail
    const maxResUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    try {
      const response = await fetch(maxResUrl, { method: 'HEAD' });
      if (response.ok) {
        thumbnailUrl = maxResUrl;
      } else {
        thumbnailUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      }
    } catch (e) {
      console.error('Error checking thumbnail URL:', e);
      thumbnailUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }

    // Fetch video details
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = await response.json();
        videoTitle = data.title;
        const authorName = data.author_name;

        // Parse title to extract artist and track
        const parsed = parseTitle(videoTitle);
        artist = parsed.artist || authorName || '';
        track = parsed.track || videoTitle;
      }
    } catch (e) {
      console.error('Error fetching video details:', e);
    }
  }

  // Get locale from layout
  const { locale } = await parent();
  const description = locale === 'es' ? 'Ver en Lyria' : 'Watch on Lyria';

  return {
    thumbnailUrl,
    videoTitle,
    artist,
    track,
    description
  };
};
