import { json, type RequestHandler } from '@sveltejs/kit';
import { createCacheProvider } from '$lib/cache/createCacheProvider.server';
import {
  buildSearchCacheKey,
  buildLyricCacheKey,
  type SearchResolutionCacheValue
} from '$lib/features/player/services/lrclibCache';
import {
  buildSearchRequest,
  findBestMatch,
  isValidLRCLibResponse,
  type LRCLibResponse
} from '$lib/features/player/services/lrclib';

const cacheProvider = createCacheProvider<SearchResolutionCacheValue>('lrclibSearchCache.json');
const lyricCacheProvider = createCacheProvider<LRCLibResponse>('lrclibLyricsCache.json');
const initializePromise = cacheProvider.initialize();
const lyricInitializePromise = lyricCacheProvider.initialize();

export const GET: RequestHandler = async ({ url }) => {
  await initializePromise;
  await lyricInitializePromise;

  const track = url.searchParams.get('track');
  const artist = url.searchParams.get('artist') ?? '';
  const duration = Number(url.searchParams.get('duration'));
  const artistHintParam = url.searchParams.get('artistHint');
  const artistHint = artistHintParam?.trim() ? artistHintParam : undefined;

  if (!track || !Number.isFinite(duration)) {
    return json({ error: 'Missing or invalid search parameters' }, { status: 400 });
  }

  const {
    sanitizedTrack,
    sanitizedArtist,
    url: searchUrl
  } = buildSearchRequest(track, artist, duration);
  const value = await cacheProvider.get(buildSearchCacheKey(searchUrl, artistHint));

  if (value) {
    const cachedLyric = await lyricCacheProvider.get(buildLyricCacheKey(value.lyricId));
    if (isValidLRCLibResponse(cachedLyric)) {
      return json([cachedLyric]);
    }
  }

  try {
    const response = await fetch(searchUrl);

    if (response.status === 404) {
      return json([], { status: 404 });
    }

    if (!response.ok) {
      return json({ error: 'Failed to fetch search results' }, { status: 502 });
    }

    const payload = await response.json();
    const data = Array.isArray(payload) ? payload.filter(isValidLRCLibResponse) : [];

    const finalMatch = findBestMatch(data, sanitizedTrack, sanitizedArtist, duration, artistHint);

    if (finalMatch) {
      await Promise.all([
        lyricCacheProvider.set(buildLyricCacheKey(finalMatch.id), finalMatch),
        cacheProvider.set(buildSearchCacheKey(searchUrl, artistHint), {
          lyricId: finalMatch.id
        })
      ]);
    }

    return json(data);
  } catch (error) {
    console.error('Error fetching LRCLib search results:', error);
    return json({ error: 'Failed to fetch search results' }, { status: 502 });
  }
};
