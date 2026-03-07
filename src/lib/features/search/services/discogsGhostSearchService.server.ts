import {
  extractVideoId,
  isValidYouTubeId,
  parseTitle,
  removeJunkSuffixes
} from '$lib/shared/utils';
import type { VideoItem } from '../stores/searchStore.svelte';

interface DiscogsSearchResult {
  id?: number;
  title?: string;
  type?: string;
  year?: string;
  master_id?: number;
  format?: string[];
  genre?: string[];
  style?: string[];
  community?: {
    have?: number;
    want?: number;
  };
}

interface DiscogsSearchResponse {
  results?: DiscogsSearchResult[];
}

interface DiscogsPagination {
  page?: number;
  pages?: number;
}

interface DiscogsArtistRelease {
  id?: number;
  type?: string;
  title?: string;
  artist?: string;
  role?: string;
}

interface DiscogsArtistReleasesResponse {
  pagination?: DiscogsPagination;
  releases?: DiscogsArtistRelease[];
}

interface DiscogsReleaseVideo {
  uri?: string;
  title?: string;
}

interface DiscogsReleaseDetailResponse {
  videos?: DiscogsReleaseVideo[];
}

export interface DiscogsGhostSearchPage {
  results: VideoItem[];
  hasMore: boolean;
  nextPage: number;
}

export type DiscogsSearchIntent = 'artist' | 'track' | 'artist_track' | 'mixed';

interface DiscogsGhostSearchOptions {
  userToken: string;
  userAgent?: string;
}

interface DiscogsReleaseCandidate {
  id: number;
  type: 'master' | 'release';
  artist: string;
  title: string;
  score: number;
}

const DEFAULT_USER_AGENT = 'Lyria/0.0.1 (+https://github.com/javierlm/Lyria)';

export class DiscogsRateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number, message = 'Discogs rate limited') {
    super(message);
    this.name = 'DiscogsRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfterMs(retryAfterHeader: string | null): number | null {
  if (!retryAfterHeader) {
    return null;
  }

  const seconds = Number(retryAfterHeader);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.floor(seconds * 1000);
  }

  const dateMs = Date.parse(retryAfterHeader);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

function normalizeMatchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeDiscogsArtistLabel(value: string): string {
  return value.replace(/\s+\(\d+\)$/g, '').trim();
}

function resolveArtistResult(
  results: DiscogsSearchResult[],
  query: string
): DiscogsSearchResult | null {
  const normalizedQuery = normalizeMatchValue(query);

  for (const result of results) {
    const title = sanitizeDiscogsArtistLabel(result.title ?? '');
    if (title && normalizeMatchValue(title) === normalizedQuery) {
      return result;
    }
  }

  const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 0);
  const scored = results
    .map((result) => {
      const normalizedTitle = normalizeMatchValue(sanitizeDiscogsArtistLabel(result.title ?? ''));
      const titleTokens = normalizedTitle.split(' ').filter((token) => token.length > 0);
      let overlap = 0;

      for (const token of queryTokens) {
        if (titleTokens.some((titleToken) => titleToken.startsWith(token))) {
          overlap += 1;
        }
      }

      return {
        result,
        score: queryTokens.length > 0 ? overlap / queryTokens.length : 0
      };
    })
    .toSorted((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < 0.5) {
    return null;
  }

  return best.result;
}

function isMainRole(role: string | undefined): boolean {
  return role?.toLowerCase() === 'main';
}

function tokenOverlapScore(left: string, right: string): number {
  const leftTokens = normalizeMatchValue(left)
    .split(' ')
    .filter((token) => token.length > 0);
  const rightTokens = normalizeMatchValue(right)
    .split(' ')
    .filter((token) => token.length > 0);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  let overlap = 0;
  for (const leftToken of leftTokens) {
    if (rightTokens.some((rightToken) => rightToken.startsWith(leftToken))) {
      overlap += 1;
    }
  }

  return overlap / leftTokens.length;
}

function inferTrackTermFromResolvedArtist(query: string, resolvedArtist: string): string {
  const normalizedQuery = normalizeMatchValue(query);
  const normalizedArtist = normalizeMatchValue(sanitizeDiscogsArtistLabel(resolvedArtist));

  if (!normalizedQuery || !normalizedArtist) {
    return '';
  }

  if (normalizedQuery === normalizedArtist) {
    return '';
  }

  const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 0);
  const artistTokens = normalizedArtist.split(' ').filter((token) => token.length > 0);

  if (artistTokens.length < 2 || queryTokens.length <= artistTokens.length) {
    return '';
  }

  let matchesPrefix = true;
  for (let i = 0; i < artistTokens.length; i += 1) {
    if (queryTokens[i] !== artistTokens[i]) {
      matchesPrefix = false;
      break;
    }
  }

  if (!matchesPrefix) {
    return '';
  }

  return queryTokens.slice(artistTokens.length).join(' ').trim();
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function stripLeadingArtistPrefix(track: string, artist: string): string {
  const normalizedArtist = normalizeMatchValue(artist);
  if (!normalizedArtist) {
    return track;
  }

  const separators = [' - ', ' – ', ' — ', ': ', '| '];
  for (const separator of separators) {
    const idx = track.indexOf(separator);
    if (idx === -1) {
      continue;
    }

    const possibleArtist = track.slice(0, idx).trim();
    if (normalizeMatchValue(possibleArtist) === normalizedArtist) {
      return track.slice(idx + separator.length).trim();
    }
  }

  return track;
}

export class DiscogsGhostSearchService {
  private readonly apiBaseUrl = 'https://api.discogs.com';
  private readonly userToken: string;
  private readonly userAgent: string;
  private readonly detailsConcurrency = 2;
  private readonly detailBatchSize = 4;
  private readonly maxReleaseDetailsPerPage = 12;
  private readonly maxCandidateDetails = 6;
  private readonly releaseSearchPerPage = 30;
  private readonly pageCacheTtlMs = 10 * 60 * 1000;
  private readonly emptyPageCacheTtlMs = 90 * 1000;
  private readonly minRateLimitCooldownMs = 30 * 1000;
  private readonly maxRateLimitCooldownMs = 10 * 60 * 1000;
  private readonly maxReleasePagesToScan = 3;
  private readonly pageCache = new Map<
    string,
    { expiresAt: number; page: DiscogsGhostSearchPage }
  >();
  private readonly inFlightPages = new Map<string, Promise<DiscogsGhostSearchPage>>();
  private rateLimitedUntil = 0;

  constructor(options: DiscogsGhostSearchOptions) {
    this.userToken = options.userToken.trim();
    this.userAgent = options.userAgent?.trim() || DEFAULT_USER_AGENT;
  }

  private getPageCacheKey(
    query: string,
    page: number,
    limit: number,
    intent: DiscogsSearchIntent,
    artistTerm: string,
    trackTerm: string
  ): string {
    return `${normalizeMatchValue(query)}|${page}|${limit}|${intent}|a:${normalizeMatchValue(artistTerm)}|t:${normalizeMatchValue(trackTerm)}`;
  }

  private getCachedPage(
    query: string,
    page: number,
    limit: number,
    intent: DiscogsSearchIntent,
    artistTerm: string,
    trackTerm: string
  ): DiscogsGhostSearchPage | null {
    const key = this.getPageCacheKey(query, page, limit, intent, artistTerm, trackTerm);
    const cached = this.pageCache.get(key);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.pageCache.delete(key);
      return null;
    }

    return cached.page;
  }

  private cachePage(
    query: string,
    page: number,
    limit: number,
    intent: DiscogsSearchIntent,
    artistTerm: string,
    trackTerm: string,
    payload: DiscogsGhostSearchPage
  ): void {
    const key = this.getPageCacheKey(query, page, limit, intent, artistTerm, trackTerm);
    const ttlMs = payload.results.length > 0 ? this.pageCacheTtlMs : this.emptyPageCacheTtlMs;
    this.pageCache.set(key, {
      expiresAt: Date.now() + ttlMs,
      page: payload
    });
  }

  private getRateLimitRemainingMs(): number {
    return Math.max(0, this.rateLimitedUntil - Date.now());
  }

  private applyRateLimit(retryAfterMs: number): DiscogsRateLimitError {
    const boundedRetryAfterMs = clampNumber(
      retryAfterMs,
      this.minRateLimitCooldownMs,
      this.maxRateLimitCooldownMs
    );

    this.rateLimitedUntil = Math.max(this.rateLimitedUntil, Date.now() + boundedRetryAfterMs);
    return new DiscogsRateLimitError(boundedRetryAfterMs);
  }

  private async requestDiscogs<T>(path: string, signal?: AbortSignal): Promise<T> {
    const rateLimitRemainingMs = this.getRateLimitRemainingMs();
    if (rateLimitRemainingMs > 0) {
      throw this.applyRateLimit(rateLimitRemainingMs);
    }

    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      signal,
      headers: {
        Authorization: `Discogs token=${this.userToken}`,
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfterMs =
          parseRetryAfterMs(response.headers.get('Retry-After')) ?? this.minRateLimitCooldownMs;
        throw this.applyRateLimit(retryAfterMs);
      }

      throw new Error(`Discogs request failed (${response.status}): ${path}`);
    }

    return (await response.json()) as T;
  }

  private async resolveArtist(
    query: string,
    signal?: AbortSignal
  ): Promise<DiscogsSearchResult | null> {
    const params = new URLSearchParams({
      type: 'artist',
      per_page: '10',
      page: '1',
      q: query.trim()
    });

    const payload = await this.requestDiscogs<DiscogsSearchResponse>(
      `/database/search?${params}`,
      signal
    );
    const results = (payload.results ?? []).filter(
      (result) => result.type === 'artist' && typeof result.id === 'number'
    );

    return resolveArtistResult(results, query);
  }

  private async resolveArtistWithPrefix(
    query: string,
    signal?: AbortSignal
  ): Promise<{ artist: DiscogsSearchResult | null; inferredTrackTerm: string }> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { artist: null, inferredTrackTerm: '' };
    }

    const directMatch = await this.resolveArtist(trimmedQuery, signal);
    if (directMatch) {
      const inferredTrackTerm = inferTrackTermFromResolvedArtist(
        trimmedQuery,
        directMatch.title ?? ''
      );
      return {
        artist: directMatch,
        inferredTrackTerm
      };
    }

    const tokens = trimmedQuery.split(/\s+/).filter((token) => token.length > 0);
    if (tokens.length < 3) {
      return { artist: null, inferredTrackTerm: '' };
    }

    const minPrefixTokens = 2;
    const maxPrefixAttempts = 3;
    let attempts = 0;

    for (let prefixLength = tokens.length - 1; prefixLength >= minPrefixTokens; prefixLength -= 1) {
      if (attempts >= maxPrefixAttempts) {
        break;
      }

      const artistPrefix = tokens.slice(0, prefixLength).join(' ');
      const resolved = await this.resolveArtist(artistPrefix, signal);
      attempts += 1;

      if (!resolved?.title) {
        continue;
      }

      const resolvedArtistLabel = sanitizeDiscogsArtistLabel(resolved.title);
      const overlap = tokenOverlapScore(artistPrefix, resolvedArtistLabel);
      if (overlap < 0.8) {
        continue;
      }

      const inferredTrackTerm = tokens.slice(prefixLength).join(' ').trim();
      return {
        artist: resolved,
        inferredTrackTerm
      };
    }

    return { artist: null, inferredTrackTerm: '' };
  }

  private scoreReleaseCandidate(
    result: DiscogsSearchResult,
    normalizedArtistTerm: string,
    normalizedTrackTerm: string,
    normalizedQuery: string
  ): number {
    const title = sanitizeDiscogsArtistLabel(result.title ?? '');
    const normalizedTitle = normalizeMatchValue(title);
    const artistScore = normalizedArtistTerm
      ? tokenOverlapScore(normalizedTitle, normalizedArtistTerm)
      : 0;
    const trackScore = normalizedTrackTerm
      ? tokenOverlapScore(normalizedTitle, normalizedTrackTerm)
      : 0;
    const trackCoverage = normalizedTrackTerm
      ? tokenOverlapScore(normalizedTrackTerm, normalizedTitle)
      : 0;
    const queryScore = normalizedQuery ? tokenOverlapScore(normalizedTitle, normalizedQuery) : 0;

    let score = queryScore * 50 + artistScore * 45 + trackScore * 30 + trackCoverage * 55;

    const have = safeNumber(result.community?.have);
    const want = safeNumber(result.community?.want);
    score += Math.log1p(have) * 3;
    score += Math.log1p(want) * 1.5;

    if (normalizedArtistTerm && artistScore < 0.35) {
      score -= 40;
    }

    if (normalizedTrackTerm && trackScore < 0.2) {
      score -= 20;
    }

    if (normalizedTrackTerm && trackCoverage < 0.5) {
      score -= 45;
    }

    return score;
  }

  private async searchReleaseCandidates(
    query: string,
    page: number,
    artistTerm: string,
    trackTerm: string,
    signal?: AbortSignal
  ): Promise<{ candidates: DiscogsReleaseCandidate[]; hasMore: boolean; nextPage: number }> {
    const trimmedArtist = artistTerm.trim();
    const trimmedTrack = trackTerm.trim();
    const trimmedQuery = query.trim();

    const buildParams = (mode: 'strict' | 'artist_q' | 'broad_q'): URLSearchParams => {
      const params = new URLSearchParams({
        type: 'release',
        page: String(page),
        per_page: String(this.releaseSearchPerPage)
      });

      const fallbackQuery = (trimmedQuery || `${trimmedArtist} ${trimmedTrack}`.trim()).trim();

      if (mode === 'strict') {
        if (trimmedArtist) {
          params.set('artist', trimmedArtist);
        }

        if (trimmedTrack) {
          params.set('track', trimmedTrack);

          const trackTokens = trimmedTrack.split(/\s+/).filter((token) => token.length > 0);
          const likelyPartialTrack = trimmedTrack.length <= 12 || trackTokens.length <= 2;
          if (!likelyPartialTrack) {
            params.set('release_title', trimmedTrack);
          }
        }

        params.set('q', fallbackQuery);
        return params;
      }

      if (mode === 'artist_q') {
        if (trimmedArtist) {
          params.set('artist', trimmedArtist);
        }

        params.set('q', fallbackQuery);
        return params;
      }

      params.set('q', fallbackQuery);
      return params;
    };

    const searchModes: Array<'strict' | 'artist_q' | 'broad_q'> = ['strict'];
    if (trimmedArtist) {
      searchModes.push('artist_q');
    }
    searchModes.push('broad_q');

    const normalizedArtist = normalizeMatchValue(trimmedArtist);
    const normalizedTrack = normalizeMatchValue(trimmedTrack);
    const normalizedQuery = normalizeMatchValue(trimmedQuery);

    const unique = new Map<string, DiscogsReleaseCandidate>();
    let hasMore = false;

    for (const mode of searchModes) {
      const payload = await this.requestDiscogs<DiscogsSearchResponse>(
        `/database/search?${buildParams(mode)}`,
        signal
      );

      const scored = (payload.results ?? [])
        .map((result) => {
          const resultType =
            result.type === 'master' ? 'master' : result.type === 'release' ? 'release' : null;
          if (!resultType || typeof result.id !== 'number') {
            return null;
          }

          const score = this.scoreReleaseCandidate(
            result,
            normalizedArtist,
            normalizedTrack,
            normalizedQuery
          );
          if (score < 10) {
            return null;
          }

          const parsed = parseTitle(result.title ?? '');
          const fallbackArtist =
            parsed.artist || sanitizeDiscogsArtistLabel(result.title ?? 'Unknown Artist');
          const fallbackTrack = parsed.track || removeJunkSuffixes(result.title ?? 'Unknown Track');

          return {
            id: result.id,
            type: resultType,
            artist: fallbackArtist || 'Unknown Artist',
            title: fallbackTrack || 'Unknown Track',
            score
          } satisfies DiscogsReleaseCandidate;
        })
        .filter((entry): entry is DiscogsReleaseCandidate => Boolean(entry))
        .toSorted((a, b) => b.score - a.score);

      for (const candidate of scored) {
        const key = `${candidate.type}:${candidate.id}`;
        if (!unique.has(key)) {
          unique.set(key, candidate);
        }
        if (unique.size >= this.maxCandidateDetails * 2) {
          break;
        }
      }

      hasMore = hasMore || (payload.results ?? []).length >= this.releaseSearchPerPage;
      if (unique.size >= Math.max(4, this.maxCandidateDetails)) {
        break;
      }
    }

    return {
      candidates: [...unique.values()],
      hasMore,
      nextPage: hasMore ? page + 1 : page
    };
  }

  private async fetchArtistReleases(
    artistId: number,
    page: number,
    perPage: number,
    signal?: AbortSignal
  ): Promise<DiscogsArtistReleasesResponse> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      sort: 'year',
      sort_order: 'desc'
    });

    return await this.requestDiscogs<DiscogsArtistReleasesResponse>(
      `/artists/${artistId}/releases?${params}`,
      signal
    );
  }

  private async fetchReleaseVideos(
    release: DiscogsArtistRelease,
    signal?: AbortSignal
  ): Promise<VideoItem[]> {
    const releaseId = release.id;
    if (typeof releaseId !== 'number') {
      return [];
    }

    const endpoint = release.type === 'master' ? `/masters/${releaseId}` : `/releases/${releaseId}`;

    let payload: DiscogsReleaseDetailResponse;
    try {
      payload = await this.requestDiscogs<DiscogsReleaseDetailResponse>(endpoint, signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      if (error instanceof DiscogsRateLimitError) {
        throw error;
      }

      return [];
    }

    const fallbackArtist =
      sanitizeDiscogsArtistLabel(release.artist ?? 'Unknown Artist') || 'Unknown Artist';
    const fallbackTrack = removeJunkSuffixes((release.title ?? '').trim()) || 'Unknown Track';
    const seenVideoIds = new Set<string>();
    const videos: VideoItem[] = [];

    for (const video of payload.videos ?? []) {
      const videoId = extractVideoId(video.uri ?? '');
      if (!videoId || !isValidYouTubeId(videoId) || seenVideoIds.has(videoId)) {
        continue;
      }

      seenVideoIds.add(videoId);

      const rawTitle = (video.title ?? '').trim();
      const parsed = parseTitle(rawTitle);
      const parsedArtistMatchesFallback =
        parsed.artist && normalizeMatchValue(parsed.artist) === normalizeMatchValue(fallbackArtist);

      const candidateTrack = parsedArtistMatchesFallback ? parsed.track : rawTitle;
      const withoutArtistPrefix = stripLeadingArtistPrefix(candidateTrack, fallbackArtist);
      const track =
        removeJunkSuffixes(withoutArtistPrefix) ||
        removeJunkSuffixes(fallbackTrack) ||
        'Unknown Track';

      videos.push({
        videoId,
        artist: fallbackArtist,
        track,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        timestamp: null,
        isFavorite: false,
        isGhost: true,
        source: 'ghost',
        ghostProvider: 'discogs'
      });
    }

    return videos;
  }

  private async mapConcurrent<TInput, TOutput>(
    inputs: TInput[],
    concurrency: number,
    mapper: (input: TInput, index: number) => Promise<TOutput>
  ): Promise<TOutput[]> {
    const results: TOutput[] = [];
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < inputs.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const input = inputs[currentIndex] as TInput;
        results[currentIndex] = await mapper(input, currentIndex);
      }
    };

    const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
    await Promise.all(workers);

    return results;
  }

  async searchVideosPage(
    queryText: string,
    options: {
      limit?: number;
      page?: number;
      signal?: AbortSignal;
      intent?: DiscogsSearchIntent;
      artistTerm?: string;
      trackTerm?: string;
    } = {}
  ): Promise<DiscogsGhostSearchPage> {
    const query = queryText.trim();
    const limit = clampNumber(options.limit ?? 20, 1, 30);
    const page = Math.max(1, options.page ?? 1);
    const signal = options.signal;
    const intent = options.intent ?? 'artist';
    const artistTerm = options.artistTerm?.trim() ?? '';
    const trackTerm = options.trackTerm?.trim() ?? '';

    const cached = this.getCachedPage(query, page, limit, intent, artistTerm, trackTerm);
    if (cached) {
      return cached;
    }

    const inFlightKey = this.getPageCacheKey(query, page, limit, intent, artistTerm, trackTerm);
    const inFlight = this.inFlightPages.get(inFlightKey);
    if (inFlight) {
      return await inFlight;
    }

    const task = this.searchVideosPageInternal(
      query,
      limit,
      page,
      intent,
      artistTerm,
      trackTerm,
      signal
    );
    this.inFlightPages.set(inFlightKey, task);

    try {
      const result = await task;
      this.cachePage(query, page, limit, intent, artistTerm, trackTerm, result);
      return result;
    } finally {
      this.inFlightPages.delete(inFlightKey);
    }
  }

  private async searchVideosPageInternal(
    query: string,
    limit: number,
    page: number,
    intent: DiscogsSearchIntent,
    artistTerm: string,
    trackTerm: string,
    signal?: AbortSignal
  ): Promise<DiscogsGhostSearchPage> {
    if (this.getRateLimitRemainingMs() > 0) {
      throw this.applyRateLimit(this.getRateLimitRemainingMs());
    }

    if (!query) {
      return {
        results: [],
        hasMore: false,
        nextPage: page
      };
    }

    let effectiveArtistTerm = artistTerm;
    let effectiveTrackTerm = trackTerm;
    let resolvedArtist: DiscogsSearchResult | null = null;

    if (intent === 'artist' && !effectiveArtistTerm) {
      const resolved = await this.resolveArtistWithPrefix(query, signal);
      resolvedArtist = resolved.artist;
      const resolvedArtistLabel = sanitizeDiscogsArtistLabel(resolvedArtist?.title ?? '');

      if (resolvedArtistLabel) {
        effectiveArtistTerm = resolvedArtistLabel;
      }

      if (!effectiveTrackTerm) {
        effectiveTrackTerm = resolved.inferredTrackTerm;
      }
    } else if (intent === 'artist' || (!effectiveArtistTerm && intent !== 'track')) {
      resolvedArtist = await this.resolveArtist(effectiveArtistTerm || query, signal);
      const resolvedArtistLabel = sanitizeDiscogsArtistLabel(resolvedArtist?.title ?? '');

      if (!effectiveArtistTerm && resolvedArtistLabel) {
        effectiveArtistTerm = resolvedArtistLabel;
      }

      if (!effectiveTrackTerm && intent === 'artist' && resolvedArtistLabel) {
        effectiveTrackTerm = inferTrackTermFromResolvedArtist(query, resolvedArtistLabel);
      }
    }

    const shouldUseTargetedReleaseSearch =
      intent === 'artist_track' ||
      intent === 'mixed' ||
      (intent === 'track' && effectiveTrackTerm.length > 0) ||
      (intent === 'artist' && effectiveArtistTerm.length > 0 && effectiveTrackTerm.length > 0);

    const merged: VideoItem[] = [];
    const seenVideoIds = new Set<string>();
    let hasMore = false;
    let nextPage = page;

    if (shouldUseTargetedReleaseSearch) {
      const releaseQuery =
        effectiveArtistTerm && effectiveTrackTerm
          ? `${effectiveArtistTerm} ${effectiveTrackTerm}`
          : query;
      const candidatesPage = await this.searchReleaseCandidates(
        releaseQuery,
        page,
        effectiveArtistTerm,
        effectiveTrackTerm,
        signal
      );

      const topCandidates = candidatesPage.candidates.slice(0, this.maxCandidateDetails);
      const candidateVideos = await this.mapConcurrent(
        topCandidates,
        this.detailsConcurrency,
        async (candidate) =>
          await this.fetchReleaseVideos(
            {
              id: candidate.id,
              type: candidate.type,
              title: candidate.title,
              artist: candidate.artist,
              role: 'Main'
            },
            signal
          )
      );

      for (const videos of candidateVideos) {
        for (const video of videos) {
          if (seenVideoIds.has(video.videoId)) {
            continue;
          }

          seenVideoIds.add(video.videoId);
          merged.push(video);
          if (merged.length >= limit) {
            break;
          }
        }

        if (merged.length >= limit) {
          break;
        }
      }

      hasMore = candidatesPage.hasMore;
      nextPage = candidatesPage.nextPage;
    }

    const fallbackArtistQuery = effectiveArtistTerm || query;
    const shouldFallbackToArtistScan = intent === 'artist' || merged.length < Math.min(3, limit);
    if (shouldFallbackToArtistScan && merged.length < limit) {
      const artistPage = await this.searchVideosFromArtistReleases(
        fallbackArtistQuery,
        limit - merged.length,
        page,
        resolvedArtist,
        effectiveTrackTerm,
        signal
      );

      for (const video of artistPage.results) {
        if (seenVideoIds.has(video.videoId)) {
          continue;
        }

        seenVideoIds.add(video.videoId);
        merged.push(video);
        if (merged.length >= limit) {
          break;
        }
      }

      hasMore = hasMore || artistPage.hasMore;
      if (artistPage.nextPage > nextPage) {
        nextPage = artistPage.nextPage;
      }
    }

    return {
      results: merged,
      hasMore,
      nextPage
    };
  }

  private async searchVideosFromArtistReleases(
    query: string,
    limit: number,
    page: number,
    resolvedArtist?: DiscogsSearchResult | null,
    preferredTrackTerm = '',
    signal?: AbortSignal
  ): Promise<DiscogsGhostSearchPage> {
    const artist =
      resolvedArtist === undefined ? await this.resolveArtist(query, signal) : resolvedArtist;
    if (!artist || typeof artist.id !== 'number') {
      return {
        results: [],
        hasMore: false,
        nextPage: page
      };
    }

    const merged: VideoItem[] = [];
    const preferred: VideoItem[] = [];
    const seenVideoIds = new Set<string>();
    const normalizedPreferredTrack = normalizeMatchValue(preferredTrackTerm);

    const releasesPerPage = clampNumber(Math.max(limit, 12), 12, 24);
    const resolvedArtistLabel = sanitizeDiscogsArtistLabel(artist.title ?? query);
    let lastFetchedPage = page;
    let totalPages = page;

    for (let pageOffset = 0; pageOffset < this.maxReleasePagesToScan; pageOffset += 1) {
      const currentPage = page + pageOffset;
      const releasePayload = await this.fetchArtistReleases(
        artist.id,
        currentPage,
        releasesPerPage,
        signal
      );
      lastFetchedPage = releasePayload.pagination?.page ?? currentPage;
      totalPages = releasePayload.pagination?.pages ?? currentPage;

      const releases = (releasePayload.releases ?? [])
        .filter((release) => {
          if (isMainRole(release.role)) {
            return true;
          }

          const overlap = tokenOverlapScore(release.artist ?? '', resolvedArtistLabel);
          return overlap >= 0.6;
        })
        .toSorted((a, b) => Number(isMainRole(b.role)) - Number(isMainRole(a.role)))
        .slice(0, this.maxReleaseDetailsPerPage);

      for (let start = 0; start < releases.length; start += this.detailBatchSize) {
        const batch = releases.slice(start, start + this.detailBatchSize);
        const batchVideos = await this.mapConcurrent(
          batch,
          this.detailsConcurrency,
          async (release) => await this.fetchReleaseVideos(release, signal)
        );

        for (const releaseVideos of batchVideos) {
          for (const video of releaseVideos) {
            if (seenVideoIds.has(video.videoId)) {
              continue;
            }

            seenVideoIds.add(video.videoId);
            merged.push(video);

            if (normalizedPreferredTrack) {
              const trackMatchCoverage = tokenOverlapScore(
                normalizedPreferredTrack,
                normalizeMatchValue(video.track)
              );
              const trackMatchScore = tokenOverlapScore(
                normalizeMatchValue(video.track),
                normalizedPreferredTrack
              );
              if (trackMatchCoverage >= 0.7 || trackMatchScore >= 0.3) {
                preferred.push(video);
              }
            }

            if (merged.length >= limit) {
              break;
            }
          }

          if (merged.length >= limit) {
            break;
          }
        }

        if (merged.length >= limit) {
          break;
        }
      }

      const hasMorePages = lastFetchedPage < totalPages;
      const enoughPreferred = normalizedPreferredTrack
        ? preferred.length >= Math.min(limit, 2)
        : merged.length > 0;
      if (merged.length >= limit || !hasMorePages || enoughPreferred) {
        break;
      }
    }

    const hasMore = lastFetchedPage < totalPages;
    const finalResults = normalizedPreferredTrack
      ? preferred.length > 0
        ? [
            ...preferred,
            ...merged.filter((video) => !preferred.some((p) => p.videoId === video.videoId))
          ]
        : merged
      : merged;

    return {
      results: finalResults.slice(0, limit),
      hasMore,
      nextPage: hasMore ? lastFetchedPage + 1 : lastFetchedPage
    };
  }
}
