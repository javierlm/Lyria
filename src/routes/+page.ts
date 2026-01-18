import { redirect } from '@sveltejs/kit';
import { extractVideoId } from '$lib/shared/utils';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
  const urlParam = url.searchParams.get('url') ?? url.searchParams.get('text');
  const idParam = url.searchParams.get('id');
  const offsetParam = url.searchParams.get('offset');

  if (idParam || urlParam) {
    const searchParams = new URLSearchParams();
    let videoIdToUse: string | null = null;

    if (idParam) {
      videoIdToUse = idParam;
    } else if (urlParam) {
      videoIdToUse = extractVideoId(urlParam);
    }

    if (videoIdToUse) {
      searchParams.set('id', videoIdToUse);
    }
    if (offsetParam) {
      searchParams.set('offset', offsetParam);
    }
    if (videoIdToUse) {
      throw redirect(302, `/play?${searchParams.toString()}`);
    }
  }
  return {};
};
