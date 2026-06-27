import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CacheProvider } from '$lib/cache/CacheProvider';
import type { LRCLibResponse } from '$lib/features/player/services/lrclib';
import {
  buildSearchRequest,
  findBestMatch,
  getLyricById,
  getSyncedLyrics
} from '$lib/features/player/services/lrclib';
import { buildLyricCacheKey, buildSearchCacheKey } from '$lib/features/player/services/lrclibCache';

interface SearchResolutionCacheValue {
  lyricId: number;
}

interface FetchMockState {
  searchCache: Map<string, number>;
  lyricCache: Map<number, LRCLibResponse>;
  searchResponses: Map<string, LRCLibResponse[]>;
  lyricResponses: Map<number, LRCLibResponse>;
  lrclibSearchCalls: string[];
  lrclibGetCalls: number[];
  cacheMutationCalls: string[];
}

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

function createFetchMock(): FetchMockState {
  const state: FetchMockState = {
    searchCache: new Map<string, number>(),
    lyricCache: new Map<number, LRCLibResponse>(),
    searchResponses: new Map<string, LRCLibResponse[]>(),
    lyricResponses: new Map<number, LRCLibResponse>(),
    lrclibSearchCalls: [],
    lrclibGetCalls: [],
    cacheMutationCalls: []
  };

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const requestUrl = String(input);

    if (requestUrl.startsWith('/api/lrclib/cache/search?')) {
      const url = new URL(requestUrl, 'http://localhost');
      const track = url.searchParams.get('track');
      const artist = url.searchParams.get('artist') ?? '';
      const duration = Number(url.searchParams.get('duration'));
      const artistHint = url.searchParams.get('artistHint') ?? undefined;

      if (!track || !Number.isFinite(duration)) {
        return createJsonResponse(
          { error: 'Missing or invalid search parameters' },
          { status: 400 }
        );
      }

      const {
        sanitizedTrack,
        sanitizedArtist,
        url: searchUrl
      } = buildSearchRequest(track, artist, duration);
      const cachedLyricId = state.searchCache.get(buildSearchCacheKey(searchUrl, artistHint));

      if (cachedLyricId !== undefined) {
        const cachedLyric = state.lyricCache.get(cachedLyricId);
        if (cachedLyric) {
          return createJsonResponse([cachedLyric]);
        }
      }

      state.lrclibSearchCalls.push(searchUrl);
      const results = state.searchResponses.get(searchUrl) ?? [];
      const finalMatch = findBestMatch(
        results,
        sanitizedTrack,
        sanitizedArtist,
        duration,
        artistHint
      );

      if (finalMatch) {
        state.lyricCache.set(finalMatch.id, finalMatch);
        state.searchCache.set(buildSearchCacheKey(searchUrl, artistHint), finalMatch.id);
      }

      return createJsonResponse(results);
    }

    if (requestUrl.startsWith('/api/lrclib/cache/lyric/')) {
      const id = Number(requestUrl.split('/').pop());

      const lyric = state.lyricCache.get(id);
      if (lyric) {
        return createJsonResponse(lyric);
      }

      state.lrclibGetCalls.push(id);
      const responseLyric = state.lyricResponses.get(id);
      if (!responseLyric) {
        return createJsonResponse({ found: false }, { status: 404 });
      }

      state.lyricCache.set(id, responseLyric);
      return createJsonResponse(responseLyric);
    }

    if (requestUrl.startsWith('/api/lrclib/cache/') && init?.method === 'POST') {
      state.cacheMutationCalls.push(requestUrl);
      return createJsonResponse({ error: 'Method not allowed' }, { status: 405 });
    }

    if (requestUrl.startsWith('https://lrclib.net/api/search')) {
      state.lrclibSearchCalls.push(requestUrl);
      return createJsonResponse(state.searchResponses.get(requestUrl) ?? []);
    }

    if (requestUrl.startsWith('https://lrclib.net/api/get/')) {
      const id = Number(requestUrl.split('/').pop());
      state.lrclibGetCalls.push(id);
      const lyric = state.lyricResponses.get(id);

      return lyric
        ? createJsonResponse(lyric)
        : createJsonResponse({ error: 'Not found' }, { status: 404 });
    }

    throw new Error(`Unhandled fetch URL in test: ${requestUrl}`);
  });

  return state;
}

function createCandidate(
  id: number,
  trackName: string,
  duration: number,
  artistName = 'Lord of the Lost'
): LRCLibResponse {
  return {
    id,
    name: trackName,
    trackName,
    artistName,
    albumName: 'Blood & Glitter',
    duration,
    instrumental: false,
    plainLyrics: 'line',
    syncedLyrics: '[00:00.00]line'
  };
}

class InMemoryCacheProvider<T> implements CacheProvider<T> {
  private store = new Map<string, T>();

  async get(key: string): Promise<T | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return [...this.store.keys()];
  }

  async size(): Promise<number> {
    return this.store.size;
  }

  async initialize(): Promise<void> {}
}

async function loadRouteHandlers() {
  vi.resetModules();

  const searchCacheProvider = new InMemoryCacheProvider<SearchResolutionCacheValue>();
  const lyricCacheProvider = new InMemoryCacheProvider<LRCLibResponse>();

  vi.doMock('$lib/cache/createCacheProvider.server', () => ({
    createCacheProvider: <T>(localFileName: string): CacheProvider<T> => {
      if (localFileName === 'lrclibSearchCache.json') {
        return searchCacheProvider as CacheProvider<T>;
      }

      if (localFileName === 'lrclibLyricsCache.json') {
        return lyricCacheProvider as CacheProvider<T>;
      }

      throw new Error(`Unexpected cache provider request: ${localFileName}`);
    }
  }));

  const [searchRouteModule, lyricRouteModule] = await Promise.all([
    import('../../routes/api/lrclib/cache/search/+server'),
    import('../../routes/api/lrclib/cache/lyric/[id]/+server')
  ]);

  return {
    searchCacheProvider,
    lyricCacheProvider,
    searchRouteModule,
    lyricRouteModule
  };
}

describe('getSyncedLyrics automatic detection', () => {
  let fetchState: FetchMockState;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchState = createFetchMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects ambiguous title-only matches when Topic artist hint does not match', async () => {
    const searchUrl = 'https://lrclib.net/api/search?q=The%20Land%20of%20the%20Free&duration=273';
    fetchState.searchResponses.set(searchUrl, [
      {
        id: 1,
        name: 'Land of the Free',
        trackName: 'Land of the Free',
        artistName: 'Home Free',
        albumName: 'Land of the Free',
        duration: 273,
        instrumental: false,
        plainLyrics: 'line',
        syncedLyrics: '[00:00.00]line'
      },
      {
        id: 2,
        name: 'Land of the Free',
        trackName: 'Land of the Free',
        artistName: 'Pennywise',
        albumName: 'Land of the Free',
        duration: 273,
        instrumental: false,
        plainLyrics: 'line',
        syncedLyrics: '[00:00.00]line'
      }
    ]);

    const result = await getSyncedLyrics('The Land of the Free', '', 273, {
      artistHint: 'Visions of Atlantis - Topic'
    });

    expect(result.found).toBe(false);
    expect(result.candidates).toHaveLength(2);
  });

  it('keeps working when a candidate matches the Topic artist hint', async () => {
    const searchUrl = 'https://lrclib.net/api/search?q=The%20Land%20of%20the%20Free&duration=273';
    fetchState.searchResponses.set(searchUrl, [
      {
        id: 1,
        name: 'Land of the Free',
        trackName: 'Land of the Free',
        artistName: 'Home Free',
        albumName: 'Land of the Free',
        duration: 273,
        instrumental: false,
        plainLyrics: 'line',
        syncedLyrics: '[00:00.00]line'
      },
      {
        id: 2,
        name: 'The Land of the Free',
        trackName: 'The Land of the Free',
        artistName: 'Visions of Atlantis',
        albumName: 'Pirates II: Armada',
        duration: 273,
        instrumental: false,
        plainLyrics: 'line',
        syncedLyrics: null
      }
    ]);

    const result = await getSyncedLyrics('The Land of the Free', '', 273, {
      artistHint: 'Visions of Atlantis - Topic'
    });

    expect(result.found).toBe(true);
    expect(result.artistName).toBe('Visions of Atlantis');
    expect(result.trackName).toBe('The Land of the Free');
  });

  it('penalizes remix candidates when the query does not ask for a remix', async () => {
    const searchUrl =
      'https://lrclib.net/api/search?q=Lord%20of%20the%20Lost%20Blood%20%20Glitter&duration=259';
    fetchState.searchResponses.set(searchUrl, [
      createCandidate(1, 'Blood & Glitter', 179),
      createCandidate(2, 'Blood & Glitter (Extended Version)', 242),
      createCandidate(3, 'Blood & Glitter (Faderhead Remix)', 203)
    ]);

    const result = await getSyncedLyrics('Blood & Glitter', 'Lord of the Lost', 259);

    expect(result.found).toBe(true);
    expect(result.trackName).toBe('Blood & Glitter (Extended Version)');
  });

  it('still prefers the remix when the query explicitly asks for it', async () => {
    const searchUrl =
      'https://lrclib.net/api/search?q=Lord%20of%20the%20Lost%20Blood%20%20Glitter%20Faderhead%20Remix&duration=203';
    fetchState.searchResponses.set(searchUrl, [
      createCandidate(1, 'Blood & Glitter', 179),
      createCandidate(2, 'Blood & Glitter (Extended Version)', 242),
      createCandidate(3, 'Blood & Glitter (Faderhead Remix)', 203)
    ]);

    const result = await getSyncedLyrics(
      'Blood & Glitter (Faderhead Remix)',
      'Lord of the Lost',
      203
    );

    expect(result.found).toBe(true);
    expect(result.trackName).toBe('Blood & Glitter (Faderhead Remix)');
  });

  it('keeps extended versions almost neutral and lets duration break close ties', async () => {
    const searchUrl =
      'https://lrclib.net/api/search?q=Lord%20of%20the%20Lost%20Blood%20%20Glitter&duration=259';
    fetchState.searchResponses.set(searchUrl, [
      createCandidate(1, 'Blood & Glitter', 179),
      createCandidate(2, 'Blood & Glitter (Extended Version)', 242)
    ]);

    const result = await getSyncedLyrics('Blood & Glitter', 'Lord of the Lost', 259);

    expect(result.found).toBe(true);
    expect(result.trackName).toBe('Blood & Glitter (Extended Version)');
  });

  it('reuses cached lyric by id for repeated automatic searches with the same query', async () => {
    const searchUrl =
      'https://lrclib.net/api/search?q=The%20Cachers%20Cache%20Me%20If%20You%20Can&duration=201';
    fetchState.searchResponses.set(searchUrl, [
      createCandidate(11, 'Cache Me If You Can', 201, 'The Cachers')
    ]);

    const firstResult = await getSyncedLyrics('Cache Me If You Can', 'The Cachers', 201);
    const secondResult = await getSyncedLyrics('Cache Me If You Can', 'The Cachers', 201);

    expect(firstResult.found).toBe(true);
    expect(secondResult.found).toBe(true);
    expect(fetchState.lrclibSearchCalls).toHaveLength(1);
    expect(fetchState.cacheMutationCalls).toEqual([]);
  });

  it('reuses the lyric cache in getLyricById after an automatic fetch', async () => {
    const searchUrl =
      'https://lrclib.net/api/search?q=The%20Cachers%20Cached%20Original&duration=188';
    fetchState.searchResponses.set(searchUrl, [
      createCandidate(12, 'Cached Original', 188, 'The Cachers')
    ]);
    fetchState.lyricResponses.set(12, createCandidate(12, 'Cached Original', 188, 'The Cachers'));

    const automaticResult = await getSyncedLyrics('Cached Original', 'The Cachers', 188);
    const byIdResult = await getLyricById(12);

    expect(automaticResult.found).toBe(true);
    expect(byIdResult.found).toBe(true);
    expect(byIdResult.id).toBe(12);
    expect(fetchState.lrclibSearchCalls).toHaveLength(1);
    expect(fetchState.lrclibGetCalls).toHaveLength(0);
    expect(fetchState.cacheMutationCalls).toEqual([]);
  });

  it('falls back to the normal search fetch when the search cache exists but the lyric cache misses', async () => {
    const searchUrl =
      'https://lrclib.net/api/search?q=The%20Cachers%20Fallback%20Anthem&duration=199';
    const candidate = createCandidate(13, 'Fallback Anthem', 199, 'The Cachers');
    fetchState.searchResponses.set(searchUrl, [candidate]);

    const firstResult = await getSyncedLyrics('Fallback Anthem', 'The Cachers', 199);
    fetchState.lyricCache.delete(13);

    const secondResult = await getSyncedLyrics('Fallback Anthem', 'The Cachers', 199);

    expect(firstResult.found).toBe(true);
    expect(secondResult.found).toBe(true);
    expect(fetchState.lrclibSearchCalls).toHaveLength(2);
    expect(fetchState.lrclibSearchCalls[1]).toContain('/api/search');
  });

  it('does not reuse a cached lyric id when the artist hint changes', async () => {
    const searchUrl = 'https://lrclib.net/api/search?q=The%20Land%20of%20the%20Free&duration=273';
    fetchState.searchResponses.set(searchUrl, [
      createCandidate(2, 'The Land of the Free', 273, 'Visions of Atlantis')
    ]);

    const firstResult = await getSyncedLyrics('The Land of the Free', '', 273, {
      artistHint: 'Visions of Atlantis - Topic'
    });

    fetchState.searchResponses.set(searchUrl, [
      createCandidate(3, 'The Land of the Free', 273, 'Pennywise')
    ]);

    const secondResult = await getSyncedLyrics('The Land of the Free', '', 273, {
      artistHint: 'Pennywise - Topic'
    });

    expect(firstResult.id).toBe(2);
    expect(secondResult.id).toBe(3);
    expect(fetchState.lrclibSearchCalls).toHaveLength(2);
  });

  it('does not use public cache mutation POST endpoints', async () => {
    const searchUrl = 'https://lrclib.net/api/search?q=The%20Cachers%20Server%20Only&duration=205';
    fetchState.searchResponses.set(searchUrl, [
      createCandidate(21, 'Server Only', 205, 'The Cachers')
    ]);

    const searchResult = await getSyncedLyrics('Server Only', 'The Cachers', 205);
    const lyricResult = await getLyricById(21);

    expect(searchResult.found).toBe(true);
    expect(lyricResult.found).toBe(true);
    expect(fetchState.cacheMutationCalls).toEqual([]);
  });
});

describe('LRCLib cache route handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('$lib/cache/createCacheProvider.server');
  });

  it('search route treats blank artistHint as missing and caches a title-only match', async () => {
    const { searchCacheProvider, lyricCacheProvider, searchRouteModule } =
      await loadRouteHandlers();
    const candidate = createCandidate(31, 'The Land of the Free', 273, 'Visions of Atlantis');
    const searchUrl = 'https://lrclib.net/api/search?q=The%20Land%20of%20the%20Free&duration=273';

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createJsonResponse([candidate]));

    const response = await searchRouteModule.GET({
      url: new URL(
        'http://localhost/api/lrclib/cache/search?track=The%20Land%20of%20the%20Free&artist=&duration=273&artistHint=%20%20%20'
      )
    } as Parameters<typeof searchRouteModule.GET>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([candidate]);
    expect(fetchSpy).toHaveBeenCalledWith(searchUrl);
    expect(await searchCacheProvider.get(buildSearchCacheKey(searchUrl))).toEqual({
      lyricId: candidate.id
    });
    expect(await lyricCacheProvider.get(buildLyricCacheKey(candidate.id))).toEqual(candidate);
  });

  it('search route serves a cached lyric without calling upstream search', async () => {
    const { searchCacheProvider, lyricCacheProvider, searchRouteModule } =
      await loadRouteHandlers();
    const candidate = createCandidate(32, 'Cache Hit', 210, 'The Cachers');
    const searchUrl = 'https://lrclib.net/api/search?q=The%20Cachers%20Cache%20Hit&duration=210';

    await lyricCacheProvider.set(buildLyricCacheKey(candidate.id), candidate);
    await searchCacheProvider.set(buildSearchCacheKey(searchUrl), { lyricId: candidate.id });

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const response = await searchRouteModule.GET({
      url: new URL(
        'http://localhost/api/lrclib/cache/search?track=Cache%20Hit&artist=The%20Cachers&duration=210'
      )
    } as Parameters<typeof searchRouteModule.GET>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([candidate]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('lyric route caches a trusted upstream response and reuses it on the second call', async () => {
    const { lyricCacheProvider, lyricRouteModule } = await loadRouteHandlers();
    const candidate = createCandidate(33, 'Cached Original', 188, 'The Cachers');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse(candidate));

    const firstResponse = await lyricRouteModule.GET({
      params: { id: String(candidate.id) }
    } as Parameters<typeof lyricRouteModule.GET>[0]);
    const secondResponse = await lyricRouteModule.GET({
      params: { id: String(candidate.id) }
    } as Parameters<typeof lyricRouteModule.GET>[0]);

    expect(firstResponse.status).toBe(200);
    expect(await firstResponse.json()).toEqual(candidate);
    expect(secondResponse.status).toBe(200);
    expect(await secondResponse.json()).toEqual(candidate);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(`https://lrclib.net/api/get/${candidate.id}`);
    expect(await lyricCacheProvider.get(buildLyricCacheKey(candidate.id))).toEqual(candidate);
  });

  it('lyric route rejects malformed upstream payloads without caching them', async () => {
    const { lyricCacheProvider, lyricRouteModule } = await loadRouteHandlers();
    const invalidPayload = {
      id: 34,
      artistName: 'The Cachers',
      plainLyrics: 'line',
      syncedLyrics: '[00:00.00]line'
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse(invalidPayload));

    const response = await lyricRouteModule.GET({
      params: { id: '34' }
    } as Parameters<typeof lyricRouteModule.GET>[0]);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Invalid lyric payload' });
    expect(await lyricCacheProvider.get(buildLyricCacheKey(34))).toBeUndefined();
  });

  it('cache routes do not export POST handlers', async () => {
    const { searchRouteModule, lyricRouteModule } = await loadRouteHandlers();

    expect('POST' in (searchRouteModule as Record<string, unknown>)).toBe(false);
    expect('POST' in (lyricRouteModule as Record<string, unknown>)).toBe(false);
  });
});
