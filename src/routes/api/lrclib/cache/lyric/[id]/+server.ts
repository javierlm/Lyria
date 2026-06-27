import { json, type RequestHandler } from '@sveltejs/kit';
import { createCacheProvider } from '$lib/cache/createCacheProvider.server';
import { isValidLRCLibResponse, type LRCLibResponse } from '$lib/features/player/services/lrclib';
import { buildLyricCacheKey } from '$lib/features/player/services/lrclibCache';

const cacheProvider = createCacheProvider<LRCLibResponse>('lrclibLyricsCache.json');
const initializePromise = cacheProvider.initialize();
const BASE_URL_GET = 'https://lrclib.net/api/get';

export const GET: RequestHandler = async ({ params }) => {
  await initializePromise;

  const id = Number((params as { id?: string }).id);
  if (!Number.isInteger(id)) {
    return json({ error: 'Invalid lyric id' }, { status: 400 });
  }

  const value = await cacheProvider.get(buildLyricCacheKey(id));
  if (isValidLRCLibResponse(value)) {
    return json(value);
  }

  try {
    const response = await fetch(`${BASE_URL_GET}/${id}`);

    if (response.status === 404) {
      return json({ found: false }, { status: 404 });
    }

    if (!response.ok) {
      return json({ error: 'Failed to fetch lyric' }, { status: 502 });
    }

    const payload = await response.json();
    if (!isValidLRCLibResponse(payload) || payload.id !== id) {
      return json({ error: 'Invalid lyric payload' }, { status: 502 });
    }

    await cacheProvider.set(buildLyricCacheKey(id), payload);
    return json(payload);
  } catch (error) {
    console.error('Error fetching LRCLib lyric by id:', error);
    return json({ error: 'Failed to fetch lyric' }, { status: 502 });
  }
};
