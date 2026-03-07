import { videoService } from '$lib/features/video/services/videoService';
import { authStore } from '$lib/features/auth/stores/authStore.svelte';
import { extractVideoId } from '$lib/shared/utils';
import {
  wikidataGhostSearchService,
  type WikidataGhostSearchPage
} from '$lib/features/search/services/wikidataGhostSearchService';
import { SvelteMap, SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';

type VideoSource = 'user-recent' | 'user-favorite' | 'catalog' | 'ghost';

interface SearchApiResult {
  videoId: string;
  artist: string;
  track: string;
  thumbnailUrl?: string;
  isFavorite: boolean;
  isRecent: boolean;
  lastWatchedAt: number | null;
}

export type VideoItem = {
  videoId: string;
  artist: string;
  track: string;
  thumbnailUrl?: string;
  timestamp?: number | null;
  isFavorite?: boolean;
  isGhost?: boolean;
  source: VideoSource;
  ghostProvider?: 'wikidata' | 'discogs';
};

interface GhostPaginationState {
  artistOffset: number;
  titleOffset: number;
  discogsPage: number;
  hasMoreArtist: boolean;
  hasMoreTitle: boolean;
  hasMoreDiscogs: boolean;
}

interface DiscogsGhostSearchPage {
  results: VideoItem[];
  hasMore: boolean;
  nextPage: number;
}

interface CombinedGhostSearchPage {
  results: VideoItem[];
  hasMoreArtist: boolean;
  hasMoreTitle: boolean;
  hasMoreDiscogs: boolean;
  nextArtistOffset: number;
  nextTitleOffset: number;
  nextDiscogsPage: number;
}

type QueryIntent = 'artist' | 'track' | 'artist_track' | 'mixed';

interface QueryProfile {
  intent: QueryIntent;
  normalizedQuery: string;
  artistTerm: string;
  trackTerm: string;
}

interface GhostRelevanceMetrics {
  score: number;
  artistScore: number;
  trackScore: number;
  artistCoverage: number;
}

export class SearchStore {
  showSearchField = $state(false);
  showRecentVideos = $state(false);
  recentVideos: VideoItem[] = $state([]);
  filteredVideos: VideoItem[] = $state([]);
  searchValue = $state('');
  ghostVideo: VideoItem | null = $state(null);
  isFetchingGhost = $state(false);
  isLoadingMoreGhost = $state(false);
  showOnlyFavorites = $state(false);
  isKeyboardOpen = $state(false);

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private activeSearchController: AbortController | null = null;
  private activeGhostController: AbortController | null = null;
  private latestSearchRequestId = 0;
  private latestGhostRequestId = 0;
  private readonly pendingRecentDeletions = new SvelteSet<string>();
  private readonly DEBOUNCE_DELAY = 300;
  private readonly MIN_SEARCH_LENGTH = 3;
  private readonly GHOST_PAGE_SIZE = 20;
  private readonly DISCOGS_PAGE_SIZE = 15;
  private readonly MAX_GHOST_LOAD_MORE_ATTEMPTS = 3;
  private readonly GHOST_CACHE_TTL_MS = 15 * 60 * 1000;
  private readonly GHOST_RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000;
  private readonly DISCOGS_MIN_COOLDOWN_MS = 60 * 1000;
  private readonly ghostSearchCache = new SvelteMap<
    string,
    { expiresAt: number; page: WikidataGhostSearchPage }
  >();
  private readonly discogsSearchCache = new SvelteMap<
    string,
    { expiresAt: number; page: DiscogsGhostSearchPage }
  >();
  private readonly ghostPaginationState = new SvelteMap<string, GhostPaginationState>();
  private ghostSearchCooldownUntil = 0;
  private discogsCooldownUntil = 0;
  private activeSearchResults: VideoItem[] = [];
  private lastExecutedSearchKey = '';

  private filterPendingRecentDeletions(videos: VideoItem[]): VideoItem[] {
    if (this.pendingRecentDeletions.size === 0) {
      return videos;
    }

    return videos.filter((video) => !this.pendingRecentDeletions.has(video.videoId));
  }

  private hasRemoteActiveResults(): boolean {
    return this.activeSearchResults.some(
      (video) => video.source === 'catalog' || video.source === 'ghost'
    );
  }

  private getVisibleActiveSearchResults(): VideoItem[] {
    const activeResults = this.filterPendingRecentDeletions(this.activeSearchResults);

    return this.showOnlyFavorites
      ? activeResults.filter((video) => video.isFavorite)
      : [...activeResults];
  }

  private getVisibleResults(query: string): VideoItem[] {
    if (!query.trim()) {
      return this.getBaseVideos();
    }

    if (this.hasRemoteActiveResults()) {
      return this.getVisibleActiveSearchResults();
    }

    const localResults = this.searchVideos(query);
    if (localResults.length > 0) {
      return localResults;
    }

    if (!this.showOnlyFavorites && this.ghostVideo) {
      return this.filterPendingRecentDeletions([this.ghostVideo]);
    }

    return [];
  }

  private syncVisibleResults(query = this.searchValue): void {
    this.filteredVideos = this.getVisibleResults(query);
    this.showRecentVideos = this.filteredVideos.length > 0;
  }

  get canLoadMoreGhost(): boolean {
    const query = this.searchValue.trim();
    if (!this.isValidSearch(query) || this.showOnlyFavorites || extractVideoId(query)) {
      return false;
    }

    const state = this.getStoredGhostPaginationState(query);
    if (!state) {
      return false;
    }

    return state.hasMoreArtist || state.hasMoreTitle || state.hasMoreDiscogs;
  }

  private abortActiveSearch() {
    this.activeSearchController?.abort();
    this.activeSearchController = null;
  }

  private abortActiveGhostFetch() {
    this.activeGhostController?.abort();
    this.activeGhostController = null;
    this.isFetchingGhost = false;
  }

  private invalidatePendingSearches() {
    this.latestSearchRequestId += 1;
    this.latestGhostRequestId += 1;
    this.abortActiveSearch();
    this.abortActiveGhostFetch();
    this.isLoadingMoreGhost = false;
  }

  private isValidSearch(query: string): boolean {
    return query.trim().length >= this.MIN_SEARCH_LENGTH;
  }

  private getSearchTerms(query: string): string[] {
    return query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 0);
  }

  private buildSearchableText(video: Pick<VideoItem, 'artist' | 'track'>): string {
    return `${video.artist?.toLowerCase() || ''} ${video.track?.toLowerCase() || ''}`;
  }

  private normalizeToken(value: string): string {
    return value
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replaceAll(/[^a-z0-9]/g, '');
  }

  private normalizePhrase(value: string): string {
    return value
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s]/g, ' ')
      .replaceAll(/\s+/g, ' ')
      .trim();
  }

  private buildQueryProfile(query: string): QueryProfile {
    const normalizedQuery = this.normalizePhrase(query);
    const separatorMatch = new RegExp(/(.+?)\s*[-–—|:]\s*(.+)/).exec(query);

    if (separatorMatch) {
      const artistTerm = this.normalizePhrase(separatorMatch[1] ?? '');
      const trackTerm = this.normalizePhrase(separatorMatch[2] ?? '');

      if (artistTerm && trackTerm) {
        return {
          intent: 'artist_track',
          normalizedQuery,
          artistTerm,
          trackTerm
        };
      }
    }

    const tokens = normalizedQuery.split(' ').filter((token) => token.length > 0);
    let intent: QueryIntent;

    if (tokens.length <= 1) {
      intent = 'artist';
    } else if (tokens.length === 2) {
      intent = 'mixed';
    } else {
      intent = 'artist';
    }

    return {
      intent,
      normalizedQuery,
      artistTerm: intent === 'mixed' ? normalizedQuery : '',
      trackTerm: intent === 'mixed' ? normalizedQuery : ''
    };
  }

  private getDiscogsLimitForIntent(intent: QueryIntent): number {
    switch (intent) {
      case 'artist_track':
        return 10;
      case 'track':
        return 12;
      case 'artist':
        return this.DISCOGS_PAGE_SIZE;
      case 'mixed':
        return 12;
      default:
        return 12;
    }
  }

  private getMinGhostScore(intent: QueryIntent): number {
    switch (intent) {
      case 'artist_track':
        return 50;
      case 'artist':
        return 42;
      case 'track':
        return 36;
      case 'mixed':
        return 32;
      default:
        return 38;
    }
  }

  private hasLowRelevanceTrackPattern(trackText: string): boolean {
    const lowRelevanceTerms = [
      'unboxing',
      'vinyl edition',
      'horprobe',
      'hörprobe',
      'teaser',
      'trailer',
      'promo',
      'audition'
    ];

    return lowRelevanceTerms.some((term) => trackText.includes(term));
  }

  private getSignificantQueryTokens(term: string): string[] {
    const stopwords = new SvelteSet(['the', 'a', 'an', 'and', 'feat', 'ft']);
    return this.normalizePhrase(term)
      .split(' ')
      .filter((token) => token.length > 1 && !stopwords.has(token));
  }

  private tokenCoverageScore(text: string, term: string): number {
    const termTokens = this.getSignificantQueryTokens(term);
    if (termTokens.length === 0) {
      return 0;
    }

    const textTokens = this.normalizePhrase(text)
      .split(' ')
      .filter((token) => token.length > 0);

    let matched = 0;
    for (const token of termTokens) {
      if (textTokens.some((textToken) => textToken === token || textToken.startsWith(token))) {
        matched += 1;
      }
    }

    return matched / termTokens.length;
  }

  private termMatchScore(text: string, term: string): number {
    if (!term) {
      return 0;
    }

    if (!text) {
      return 0;
    }

    if (text === term) {
      return 1;
    }

    if (text.includes(term)) {
      return 0.85;
    }

    const termTokens = term.split(' ').filter((token) => token.length > 0);
    if (termTokens.length === 0) {
      return 0;
    }

    const textTokens = text.split(' ').filter((token) => token.length > 0);
    let matched = 0;

    for (const termToken of termTokens) {
      if (textTokens.some((textToken) => textToken.startsWith(termToken))) {
        matched += 1;
      }
    }

    return matched / termTokens.length;
  }

  private computeGhostRelevanceMetrics(
    video: VideoItem,
    profile: QueryProfile
  ): GhostRelevanceMetrics {
    const artistText = this.normalizePhrase(video.artist ?? '');
    const trackText = this.normalizePhrase(video.track ?? '');
    const artistScore = this.termMatchScore(
      artistText,
      profile.artistTerm || profile.normalizedQuery
    );
    const trackScore = this.termMatchScore(trackText, profile.trackTerm || profile.normalizedQuery);
    const artistCoverage = this.tokenCoverageScore(
      artistText,
      profile.artistTerm || profile.normalizedQuery
    );
    const combinedText = `${artistText} ${trackText}`.trim();
    const combinedScore = this.termMatchScore(combinedText, profile.normalizedQuery);

    let score = combinedScore * 20;

    if (profile.intent === 'artist_track') {
      score += artistScore * 70 + trackScore * 55;
      if (artistScore >= 0.99 && trackScore >= 0.99) {
        score += 100;
      }
      if (artistScore < 0.3) {
        score -= 40;
      }
      if (trackScore < 0.2) {
        score -= 25;
      }
    } else if (profile.intent === 'artist') {
      score += artistScore * 75 + trackScore * 18;
      score += artistCoverage * 45;
      if (artistScore >= 0.99) {
        score += 70;
      }
      if (artistCoverage >= 0.99) {
        score += 40;
      }
      if (artistScore < 0.3) {
        score -= 45;
      }
      if (artistCoverage < 0.5) {
        score -= 35;
      }
    } else if (profile.intent === 'track') {
      score += trackScore * 70 + artistScore * 15;
      if (trackScore >= 0.99) {
        score += 55;
      }
      if (trackScore < 0.25) {
        score -= 30;
      }
    } else {
      score += artistScore * 45 + trackScore * 40;
      score += artistCoverage * 35;

      if (artistScore >= 0.99) {
        score += 38;
      }

      if (artistCoverage >= 0.99) {
        score += 25;
      }

      if (artistScore < 0.25 && trackScore < 0.25) {
        score -= 22;
      }

      if (artistCoverage < 0.5) {
        score -= 28;
      }
    }

    if (video.ghostProvider === 'discogs' && this.hasLowRelevanceTrackPattern(trackText)) {
      score -= 35;
    }

    if (video.ghostProvider === 'wikidata') {
      score += 3;
    }

    return {
      score,
      artistScore,
      trackScore,
      artistCoverage
    };
  }

  private rankGhostResults(ghostResults: VideoItem[], query: string): VideoItem[] {
    if (ghostResults.length <= 1) {
      return ghostResults;
    }

    const profile = this.buildQueryProfile(query);
    const minScore = this.getMinGhostScore(profile.intent);

    const scored = ghostResults.map((video) => ({
      video,
      metrics: this.computeGhostRelevanceMetrics(video, profile)
    }));

    const passesProviderRules = ({ video, metrics }: (typeof scored)[number]): boolean => {
      if (video.ghostProvider === 'discogs') {
        if (
          profile.intent === 'artist' &&
          (metrics.artistScore < 0.45 || metrics.artistCoverage < 0.75)
        ) {
          return false;
        }

        if (
          profile.intent === 'artist_track' &&
          (metrics.artistScore < 0.5 || metrics.trackScore < 0.2)
        ) {
          return false;
        }

        if (profile.intent === 'mixed' && metrics.artistCoverage < 0.6) {
          return false;
        }

        if (profile.intent === 'track' && metrics.trackScore < 0.45) {
          return false;
        }
      }

      return true;
    };

    const filtered = scored
      .filter(
        ({ video, metrics }) => metrics.score >= minScore && passesProviderRules({ video, metrics })
      )
      .toSorted((a, b) => b.metrics.score - a.metrics.score);

    if (filtered.length >= 4) {
      return filtered.map((entry) => entry.video);
    }

    const relaxedMinScore = Math.max(20, minScore - 8);
    return scored
      .filter(
        ({ video, metrics }) =>
          metrics.score >= relaxedMinScore && passesProviderRules({ video, metrics })
      )
      .toSorted((a, b) => b.metrics.score - a.metrics.score)
      .map((entry) => entry.video);
  }

  private tokenizeSearchableText(searchableText: string): string[] {
    return searchableText
      .split(/\s+/)
      .map((token) => this.normalizeToken(token))
      .filter((token) => token.length > 0);
  }

  private matchesSearch(
    video: Pick<VideoItem, 'artist' | 'track'>,
    searchTerms: string[]
  ): boolean {
    const normalizedTerms = searchTerms
      .map((term) => this.normalizeToken(term))
      .filter((term) => term.length > 0);
    if (normalizedTerms.length === 0) {
      return false;
    }

    const searchableTokens = this.tokenizeSearchableText(this.buildSearchableText(video));
    return normalizedTerms.every((searchTerm) =>
      searchableTokens.some(
        (candidateToken) =>
          candidateToken.startsWith(searchTerm) ||
          this.isSingleTypoMatch(candidateToken, searchTerm)
      )
    );
  }

  private isSingleTypoMatch(candidateToken: string, searchTerm: string): boolean {
    if (candidateToken === searchTerm) {
      return true;
    }

    if (searchTerm.length < 4 || candidateToken.length < 4) {
      return false;
    }

    const lengthDelta = Math.abs(candidateToken.length - searchTerm.length);
    if (lengthDelta > 1) {
      return false;
    }

    let i = 0;
    let j = 0;
    let differences = 0;

    while (i < candidateToken.length && j < searchTerm.length) {
      if (candidateToken[i] === searchTerm[j]) {
        i += 1;
        j += 1;
        continue;
      }

      differences += 1;
      if (differences > 1) {
        return false;
      }

      if (candidateToken.length > searchTerm.length) {
        i += 1;
      } else if (candidateToken.length < searchTerm.length) {
        j += 1;
      } else {
        i += 1;
        j += 1;
      }
    }

    if (i < candidateToken.length || j < searchTerm.length) {
      differences += 1;
    }

    return differences <= 1;
  }

  private resolveSource(isFavorite?: boolean, timestamp?: number | null): VideoSource {
    if (isFavorite) {
      return 'user-favorite';
    }

    if (timestamp != null) {
      return 'user-recent';
    }

    return 'catalog';
  }

  private getSourcePriority(source: VideoSource): number {
    if (source === 'user-favorite') {
      return 3;
    }

    if (source === 'user-recent') {
      return 2;
    }

    return 1;
  }

  private compareBySourceAndTimestamp(a: VideoItem, b: VideoItem): number {
    const priorityDiff = this.getSourcePriority(b.source) - this.getSourcePriority(a.source);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return (b.timestamp ?? 0) - (a.timestamp ?? 0);
  }

  private getNormalizedQuery(query: string): string {
    return query.trim().toLowerCase();
  }

  private getSearchExecutionKey(query: string): string {
    return query.trim().toLowerCase().replaceAll(/\s+/g, ' ');
  }

  private getGhostCacheKey(query: string, artistOffset: number, titleOffset: number): string {
    return `${this.getNormalizedQuery(query)}|a:${artistOffset}|t:${titleOffset}`;
  }

  private getCachedGhostPage(
    query: string,
    artistOffset: number,
    titleOffset: number
  ): WikidataGhostSearchPage | null {
    const cacheKey = this.getGhostCacheKey(query, artistOffset, titleOffset);
    const cached = this.ghostSearchCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.ghostSearchCache.delete(cacheKey);
      return null;
    }

    return cached.page;
  }

  private cacheGhostPage(
    query: string,
    artistOffset: number,
    titleOffset: number,
    page: WikidataGhostSearchPage
  ): void {
    const cacheKey = this.getGhostCacheKey(query, artistOffset, titleOffset);
    this.ghostSearchCache.set(cacheKey, {
      expiresAt: Date.now() + this.GHOST_CACHE_TTL_MS,
      page
    });
  }

  private getStoredGhostPaginationState(query: string): GhostPaginationState | null {
    return this.ghostPaginationState.get(this.getNormalizedQuery(query)) ?? null;
  }

  private getGhostPaginationState(query: string): GhostPaginationState {
    return (
      this.getStoredGhostPaginationState(query) ?? {
        artistOffset: 0,
        titleOffset: 0,
        discogsPage: 1,
        hasMoreArtist: true,
        hasMoreTitle: true,
        hasMoreDiscogs: true
      }
    );
  }

  private setGhostPaginationState(query: string, state: GhostPaginationState): void {
    this.ghostPaginationState.set(this.getNormalizedQuery(query), state);
  }

  private clearGhostPaginationState(query: string): void {
    this.ghostPaginationState.delete(this.getNormalizedQuery(query));
  }

  private clearAllGhostPaginationState(): void {
    this.ghostPaginationState.clear();
    this.discogsSearchCache.clear();
  }

  private parseRetryAfterMs(response: Response): number {
    const retryAfter = response.headers.get('Retry-After');
    if (!retryAfter) {
      return this.DISCOGS_MIN_COOLDOWN_MS;
    }

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.max(this.DISCOGS_MIN_COOLDOWN_MS, Math.floor(seconds * 1000));
    }

    const dateMs = Date.parse(retryAfter);
    if (!Number.isNaN(dateMs)) {
      return Math.max(this.DISCOGS_MIN_COOLDOWN_MS, dateMs - Date.now());
    }

    return this.DISCOGS_MIN_COOLDOWN_MS;
  }

  private getDiscogsCacheKey(query: string, page: number, limit: number): string {
    return `${this.getNormalizedQuery(query)}|d:${page}|l:${limit}`;
  }

  private getCachedDiscogsPage(
    query: string,
    page: number,
    limit: number
  ): DiscogsGhostSearchPage | null {
    const cacheKey = this.getDiscogsCacheKey(query, page, limit);
    const cached = this.discogsSearchCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.discogsSearchCache.delete(cacheKey);
      return null;
    }

    return cached.page;
  }

  private cacheDiscogsPage(
    query: string,
    page: number,
    limit: number,
    payload: DiscogsGhostSearchPage
  ): void {
    const cacheKey = this.getDiscogsCacheKey(query, page, limit);
    this.discogsSearchCache.set(cacheKey, {
      expiresAt: Date.now() + this.GHOST_CACHE_TTL_MS,
      page: payload
    });
  }

  private shouldFetchGhostByArtist(query: string): boolean {
    if (this.showOnlyFavorites || this.isFetchingGhost) {
      return false;
    }

    if (Date.now() < this.ghostSearchCooldownUntil) {
      return false;
    }

    if (extractVideoId(query)) {
      return false;
    }

    if (query.trim().length < this.MIN_SEARCH_LENGTH) {
      return false;
    }

    return true;
  }

  private mergeGhostResults(baseResults: VideoItem[], ghostResults: VideoItem[]): VideoItem[] {
    if (ghostResults.length === 0) {
      return baseResults;
    }

    const merged = [...baseResults];
    const seenVideoIds = new SvelteSet(baseResults.map((video) => video.videoId));

    for (const ghostResult of ghostResults) {
      if (seenVideoIds.has(ghostResult.videoId)) {
        continue;
      }

      seenVideoIds.add(ghostResult.videoId);
      merged.push(ghostResult);
    }

    return merged;
  }

  private async fetchWikidataGhostVideosByArtist(
    query: string,
    pagination: { artistOffset: number; titleOffset: number },
    signal?: AbortSignal
  ): Promise<WikidataGhostSearchPage> {
    const cached = this.getCachedGhostPage(query, pagination.artistOffset, pagination.titleOffset);
    if (cached) {
      return cached;
    }

    try {
      const page = await wikidataGhostSearchService.searchVideosPage(query, {
        limit: this.GHOST_PAGE_SIZE,
        artistOffset: pagination.artistOffset,
        titleOffset: pagination.titleOffset,
        signal
      });

      this.cacheGhostPage(query, pagination.artistOffset, pagination.titleOffset, page);
      return page;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          results: [],
          hasMoreArtist: false,
          hasMoreTitle: false,
          nextArtistOffset: pagination.artistOffset,
          nextTitleOffset: pagination.titleOffset
        };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('429')) {
        this.ghostSearchCooldownUntil = Date.now() + this.GHOST_RATE_LIMIT_COOLDOWN_MS;
      }

      console.error('Failed to fetch ghost videos by artist:', error);
      return {
        results: [],
        hasMoreArtist: false,
        hasMoreTitle: false,
        nextArtistOffset: pagination.artistOffset,
        nextTitleOffset: pagination.titleOffset
      };
    }
  }

  private async fetchDiscogsVideosByArtist(
    query: string,
    page: number,
    limit: number,
    profile: QueryProfile,
    signal?: AbortSignal
  ): Promise<DiscogsGhostSearchPage> {
    if (Date.now() < this.discogsCooldownUntil) {
      return {
        results: [],
        hasMore: false,
        nextPage: page
      };
    }

    const cacheQueryKey = `${query}|i:${profile.intent}|a:${profile.artistTerm}|t:${profile.trackTerm}`;
    const cached = this.getCachedDiscogsPage(cacheQueryKey, page, limit);
    if (cached) {
      return cached;
    }

    try {
      const params = new SvelteURLSearchParams({
        q: query,
        limit: String(limit),
        page: String(page),
        intent: profile.intent
      });

      if (profile.artistTerm) {
        params.set('artist', profile.artistTerm);
      }

      if (profile.trackTerm) {
        params.set('track', profile.trackTerm);
      }

      const response = await fetch(`/api/search/discogs?${params}`, { signal });

      if (!response.ok) {
        if (response.status === 429) {
          this.discogsCooldownUntil = Date.now() + this.parseRetryAfterMs(response);
        }

        return {
          results: [],
          hasMore: false,
          nextPage: page
        };
      }

      const payload = (await response.json()) as DiscogsGhostSearchPage;
      const normalizedPage: DiscogsGhostSearchPage = {
        results: Array.isArray(payload.results) ? payload.results : [],
        hasMore: payload.hasMore === true,
        nextPage: Number.isFinite(payload.nextPage) ? Math.max(1, payload.nextPage) : page
      };

      this.cacheDiscogsPage(cacheQueryKey, page, limit, normalizedPage);
      return normalizedPage;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          results: [],
          hasMore: false,
          nextPage: page
        };
      }

      console.error('Failed to fetch ghost videos from Discogs:', error);
      return {
        results: [],
        hasMore: false,
        nextPage: page
      };
    }
  }

  private async fetchGhostVideosPage(
    query: string,
    pagination: { artistOffset: number; titleOffset: number; discogsPage: number },
    signal?: AbortSignal
  ): Promise<CombinedGhostSearchPage> {
    const queryProfile = this.buildQueryProfile(query);
    const discogsQuery = queryProfile.intent === 'artist_track' ? queryProfile.artistTerm : query;
    const discogsLimit = this.getDiscogsLimitForIntent(queryProfile.intent);
    const shouldFetchDiscogs = queryProfile.intent !== 'track';

    const [wikidataPage, discogsPage] = await Promise.all([
      this.fetchWikidataGhostVideosByArtist(
        query,
        {
          artistOffset: pagination.artistOffset,
          titleOffset: pagination.titleOffset
        },
        signal
      ),
      shouldFetchDiscogs
        ? this.fetchDiscogsVideosByArtist(
            discogsQuery,
            pagination.discogsPage,
            discogsLimit,
            queryProfile,
            signal
          )
        : Promise.resolve({
            results: [],
            hasMore: false,
            nextPage: pagination.discogsPage
          })
    ]);

    const combinedResults = this.rankGhostResults(
      this.mergeGhostResults(wikidataPage.results, discogsPage.results),
      query
    );

    return {
      results: combinedResults,
      hasMoreArtist: wikidataPage.hasMoreArtist,
      hasMoreTitle: wikidataPage.hasMoreTitle,
      hasMoreDiscogs: discogsPage.hasMore,
      nextArtistOffset: wikidataPage.nextArtistOffset,
      nextTitleOffset: wikidataPage.nextTitleOffset,
      nextDiscogsPage: discogsPage.nextPage
    };
  }

  setCentered(centered: boolean) {
    this.showSearchField = centered;
  }

  async fetchVideoInfo(
    videoId: string,
    signal?: AbortSignal
  ): Promise<{ title: string; author: string } | null> {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { signal }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return {
        title: data.title || '',
        author: data.author_name || ''
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }

      console.error('Failed to fetch video info:', error);
      return null;
    }
  }

  searchVideos(query: string): VideoItem[] {
    if (!this.isValidSearch(query)) {
      return this.getBaseVideos();
    }

    const videoId = extractVideoId(query);

    if (videoId) {
      return this.filterPendingRecentDeletions(
        this.recentVideos.filter((video) => video.videoId === videoId)
      );
    }

    const baseVideos = this.getBaseVideos();
    const searchTerms = this.getSearchTerms(query);

    if (searchTerms.length === 0) {
      return baseVideos;
    }

    return this.filterPendingRecentDeletions(
      baseVideos.filter((video) => this.matchesSearch(video, searchTerms))
    );
  }

  async searchGlobalVideos(query: string, signal?: AbortSignal): Promise<VideoItem[]> {
    try {
      const response = await fetch(`/api/search/videos?q=${encodeURIComponent(query)}&limit=30`, {
        signal
      });
      if (!response.ok) {
        return [];
      }

      const results = (await response.json()) as SearchApiResult[];

      return results.map((result) => {
        const timestamp = result.lastWatchedAt;
        let source: VideoSource = 'catalog';

        if (result.isFavorite) {
          source = 'user-favorite';
        } else if (result.isRecent) {
          source = 'user-recent';
        }

        return {
          videoId: result.videoId,
          artist: result.artist,
          track: result.track,
          thumbnailUrl: result.thumbnailUrl,
          timestamp,
          isFavorite: result.isFavorite,
          source
        };
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return [];
      }

      console.error('Failed to search videos from API:', error);
      return [];
    }
  }

  /**
   * Enriches global search results with local data (favorites/recents from IndexedDB).
   * This ensures that even for anonymous users, videos that are locally favorited/recent
   * are shown with the correct source and metadata.
   */
  private enrichWithLocalData(globalResults: VideoItem[], query: string): VideoItem[] {
    const localVideoMap = new SvelteMap(this.recentVideos.map((video) => [video.videoId, video]));
    const globalVideoIds = new SvelteSet(globalResults.map((v) => v.videoId));
    const searchTerms = this.getSearchTerms(query);

    const enrichedResults = globalResults.map((globalVideo) => {
      const localVideo = localVideoMap.get(globalVideo.videoId);
      if (!localVideo) {
        return globalVideo;
      }

      return {
        ...globalVideo,
        isFavorite: localVideo.isFavorite,
        timestamp: localVideo.timestamp,
        source: this.resolveSource(localVideo.isFavorite, localVideo.timestamp)
      };
    });

    const matchingLocalVideos = this.recentVideos.filter((localVideo) => {
      if (globalVideoIds.has(localVideo.videoId)) {
        return false;
      }

      return this.matchesSearch(localVideo, searchTerms);
    });

    const trailingLocalFallback = matchingLocalVideos.toSorted((a, b) =>
      this.compareBySourceAndTimestamp(a, b)
    );

    return [...enrichedResults, ...trailingLocalFallback].toSorted((a, b) =>
      this.compareBySourceAndTimestamp(a, b)
    );
  }

  triggerSearch() {
    clearTimeout(this.debounceTimer);
    this.ghostVideo = null;
    this.isLoadingMoreGhost = false;

    const searchExecutionKey = this.getSearchExecutionKey(this.searchValue);

    if (!this.isValidSearch(this.searchValue)) {
      this.invalidatePendingSearches();
      this.clearAllGhostPaginationState();
      this.lastExecutedSearchKey = '';
      this.activeSearchResults = [];
      this.syncVisibleResults();
      return;
    }

    if (searchExecutionKey !== this.lastExecutedSearchKey) {
      this.invalidatePendingSearches();
      this.activeSearchResults = this.searchVideos(this.searchValue);
      this.syncVisibleResults();
    }

    this.debounceTimer = setTimeout(async () => {
      const trimmedQuery = this.searchValue.trim();
      const searchExecutionKey = this.getSearchExecutionKey(this.searchValue);

      if (searchExecutionKey === this.lastExecutedSearchKey) {
        return;
      }

      this.lastExecutedSearchKey = searchExecutionKey;

      const requestId = this.latestSearchRequestId + 1;
      this.latestSearchRequestId = requestId;

      this.abortActiveSearch();
      const searchController = new AbortController();
      this.activeSearchController = searchController;

      const globalResults = await this.searchGlobalVideos(trimmedQuery, searchController.signal);
      if (requestId !== this.latestSearchRequestId) {
        return;
      }

      if (this.activeSearchController === searchController) {
        this.activeSearchController = null;
      }

      // Enrich with local data (handles anonymous users with local favorites/recents)
      this.activeSearchResults = this.filterPendingRecentDeletions(
        this.enrichWithLocalData(globalResults, trimmedQuery)
      );
      this.syncVisibleResults(trimmedQuery);

      if (!this.shouldFetchGhostByArtist(trimmedQuery)) {
        this.clearGhostPaginationState(trimmedQuery);
      }

      if (this.shouldFetchGhostByArtist(trimmedQuery)) {
        const ghostRequestId = this.latestGhostRequestId + 1;
        this.latestGhostRequestId = ghostRequestId;

        this.abortActiveGhostFetch();
        const ghostController = new AbortController();
        this.activeGhostController = ghostController;
        this.isFetchingGhost = true;

        const ghostPage = await this.fetchGhostVideosPage(
          trimmedQuery,
          { artistOffset: 0, titleOffset: 0, discogsPage: 1 },
          ghostController.signal
        );

        if (ghostRequestId !== this.latestGhostRequestId) {
          return;
        }

        this.setGhostPaginationState(trimmedQuery, {
          artistOffset: ghostPage.nextArtistOffset,
          titleOffset: ghostPage.nextTitleOffset,
          discogsPage: ghostPage.nextDiscogsPage,
          hasMoreArtist: ghostPage.hasMoreArtist,
          hasMoreTitle: ghostPage.hasMoreTitle,
          hasMoreDiscogs: ghostPage.hasMoreDiscogs
        });

        this.activeSearchResults = this.filterPendingRecentDeletions(
          this.mergeGhostResults(this.activeSearchResults, ghostPage.results)
        );
        this.syncVisibleResults(trimmedQuery);

        if (this.activeGhostController === ghostController) {
          this.activeGhostController = null;
        }

        this.isFetchingGhost = false;
      }

      const videoId = extractVideoId(trimmedQuery);
      if (videoId && this.filteredVideos.length === 0 && !this.isFetchingGhost) {
        const ghostRequestId = this.latestGhostRequestId + 1;
        this.latestGhostRequestId = ghostRequestId;

        this.abortActiveGhostFetch();
        const ghostController = new AbortController();
        this.activeGhostController = ghostController;

        this.isFetchingGhost = true;
        const videoInfo = await this.fetchVideoInfo(videoId, ghostController.signal);

        if (ghostRequestId !== this.latestGhostRequestId) {
          return;
        }

        if (videoInfo) {
          const { title, author } = videoInfo;
          const parts = title.split(/[-–—|]/);
          let artist = author;
          let track = title;

          if (parts.length >= 2) {
            artist = parts[0].trim();
            track = parts.slice(1).join('-').trim();
          }

          this.ghostVideo = {
            videoId,
            artist,
            track,
            timestamp: null,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            isFavorite: false,
            isGhost: true,
            source: 'ghost'
          };
          this.activeSearchResults = [];
          this.syncVisibleResults(trimmedQuery);
        }

        if (this.activeGhostController === ghostController) {
          this.activeGhostController = null;
        }

        this.isFetchingGhost = false;
      }
    }, this.DEBOUNCE_DELAY);
  }

  async loadMoreGhostResults() {
    const query = this.searchValue.trim();
    if (!this.shouldFetchGhostByArtist(query) || this.isLoadingMoreGhost) {
      return;
    }

    const initialState = this.getGhostPaginationState(query);
    if (!initialState.hasMoreArtist && !initialState.hasMoreTitle && !initialState.hasMoreDiscogs) {
      return;
    }

    const ghostRequestId = this.latestGhostRequestId + 1;
    this.latestGhostRequestId = ghostRequestId;

    this.abortActiveGhostFetch();
    const ghostController = new AbortController();
    this.activeGhostController = ghostController;
    this.isLoadingMoreGhost = true;
    this.isFetchingGhost = true;

    let workingResults = [...this.filteredVideos];
    let state = initialState;
    let attempts = 0;
    let addedResults = false;

    while (
      attempts < this.MAX_GHOST_LOAD_MORE_ATTEMPTS &&
      (state.hasMoreArtist || state.hasMoreTitle || state.hasMoreDiscogs)
    ) {
      const page = await this.fetchGhostVideosPage(
        query,
        {
          artistOffset: state.artistOffset,
          titleOffset: state.titleOffset,
          discogsPage: state.discogsPage
        },
        ghostController.signal
      );

      if (ghostRequestId !== this.latestGhostRequestId) {
        return;
      }

      state = {
        artistOffset: page.nextArtistOffset,
        titleOffset: page.nextTitleOffset,
        discogsPage: page.nextDiscogsPage,
        hasMoreArtist: page.hasMoreArtist,
        hasMoreTitle: page.hasMoreTitle,
        hasMoreDiscogs: page.hasMoreDiscogs
      };

      const merged = this.mergeGhostResults(workingResults, page.results);
      if (merged.length > workingResults.length) {
        workingResults = merged;
        addedResults = true;
        break;
      }

      attempts += 1;
    }

    this.setGhostPaginationState(query, state);

    if (addedResults) {
      this.activeSearchResults = this.filterPendingRecentDeletions(workingResults);
      this.syncVisibleResults(query);
    }

    if (this.activeGhostController === ghostController) {
      this.activeGhostController = null;
    }

    this.isLoadingMoreGhost = false;
    this.isFetchingGhost = false;
  }

  async loadRecentVideos() {
    const [recents, favorites] = await Promise.all([
      videoService.getRecentVideos(),
      videoService.getFavoriteVideos()
    ]);

    const videoMap = new SvelteMap<string, VideoItem>();

    favorites.forEach((fav) => {
      videoMap.set(fav.videoId, {
        ...fav,
        isFavorite: true,
        source: 'user-favorite'
      });
    });

    recents.forEach((recent) => {
      const existing = videoMap.get(recent.videoId);
      videoMap.set(recent.videoId, {
        ...recent,
        isFavorite: existing?.isFavorite ?? false,
        source: existing?.source === 'user-favorite' ? 'user-favorite' : 'user-recent'
      });
    });

    this.recentVideos = this.filterPendingRecentDeletions(
      Array.from(videoMap.values()).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    );
    this.syncVisibleResults();
  }

  async deleteRecentVideo(videoId: string) {
    if (this.pendingRecentDeletions.has(videoId)) {
      return;
    }

    if (!authStore.isAuthenticated) {
      await videoService.deleteRecentVideo(videoId);
      await this.loadRecentVideos();

      return;
    }

    const previousRecentVideos = [...this.recentVideos];
    const previousFilteredVideos = [...this.filteredVideos];
    const previousShowRecentVideos = this.showRecentVideos;

    this.pendingRecentDeletions.add(videoId);
    this.recentVideos = this.recentVideos.filter((video) => video.videoId !== videoId);
    this.syncVisibleResults();

    try {
      await videoService.deleteRecentVideo(videoId);
    } catch (error) {
      this.recentVideos = previousRecentVideos;
      this.filteredVideos = previousFilteredVideos;
      this.showRecentVideos = previousShowRecentVideos;
      throw error;
    } finally {
      this.pendingRecentDeletions.delete(videoId);
    }
  }

  toggleFavoritesFilter() {
    this.showOnlyFavorites = !this.showOnlyFavorites;
    this.syncVisibleResults();
  }

  getBaseVideos() {
    const baseVideos = this.showOnlyFavorites
      ? this.recentVideos.filter((v) => v.isFavorite)
      : this.recentVideos;

    return this.filterPendingRecentDeletions(baseVideos);
  }

  toggleSearchField() {
    this.showSearchField = !this.showSearchField;
    if (this.showSearchField) {
      this.loadRecentVideos();
    } else {
      this.reset();
    }
  }

  reset() {
    this.showRecentVideos = false;
    this.searchValue = '';
    this.ghostVideo = null;
    this.showOnlyFavorites = false;
    this.isLoadingMoreGhost = false;
    this.activeSearchResults = [];
    this.lastExecutedSearchKey = '';
    clearTimeout(this.debounceTimer);
    this.clearAllGhostPaginationState();
    this.invalidatePendingSearches();
  }
}

export const searchStore = new SearchStore();
