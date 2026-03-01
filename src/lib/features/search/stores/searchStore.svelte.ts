import { videoService } from '$lib/features/video/services/videoService';
import { authStore } from '$lib/features/auth/stores/authStore.svelte';
import { extractVideoId } from '$lib/shared/utils';
import {
  wikidataGhostSearchService,
  type WikidataGhostSearchPage
} from '$lib/features/search/services/wikidataGhostSearchService';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

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
};

interface GhostPaginationState {
  artistOffset: number;
  titleOffset: number;
  hasMoreArtist: boolean;
  hasMoreTitle: boolean;
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
  canLoadMoreGhost = $state(false);
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
  private readonly MAX_GHOST_LOAD_MORE_ATTEMPTS = 3;
  private readonly GHOST_CACHE_TTL_MS = 15 * 60 * 1000;
  private readonly GHOST_RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000;
  private readonly ghostSearchCache = new SvelteMap<
    string,
    { expiresAt: number; page: WikidataGhostSearchPage }
  >();
  private readonly ghostPaginationState = new SvelteMap<string, GhostPaginationState>();
  private ghostSearchCooldownUntil = 0;
  private activeSearchResults: VideoItem[] = [];

  private filterPendingRecentDeletions(videos: VideoItem[]): VideoItem[] {
    if (this.pendingRecentDeletions.size === 0) {
      return videos;
    }

    return videos.filter((video) => !this.pendingRecentDeletions.has(video.videoId));
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
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
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
      searchableTokens.some((candidateToken) => candidateToken.startsWith(searchTerm))
    );
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

  private getGhostPaginationState(query: string): GhostPaginationState {
    const key = this.getNormalizedQuery(query);
    return (
      this.ghostPaginationState.get(key) ?? {
        artistOffset: 0,
        titleOffset: 0,
        hasMoreArtist: true,
        hasMoreTitle: true
      }
    );
  }

  private setGhostPaginationState(query: string, state: GhostPaginationState): void {
    this.ghostPaginationState.set(this.getNormalizedQuery(query), state);
    this.canLoadMoreGhost = state.hasMoreArtist || state.hasMoreTitle;
  }

  private clearGhostPaginationState(query: string): void {
    this.ghostPaginationState.delete(this.getNormalizedQuery(query));
    this.canLoadMoreGhost = false;
  }

  private clearAllGhostPaginationState(): void {
    this.ghostPaginationState.clear();
    this.canLoadMoreGhost = false;
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

  private async fetchGhostVideosByArtist(
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

  constructor() {}

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

        return {
          videoId: result.videoId,
          artist: result.artist,
          track: result.track,
          thumbnailUrl: result.thumbnailUrl,
          timestamp,
          isFavorite: result.isFavorite,
          source: result.isFavorite ? 'user-favorite' : result.isRecent ? 'user-recent' : 'catalog'
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

    const trailingLocalFallback = matchingLocalVideos.sort((a, b) =>
      this.compareBySourceAndTimestamp(a, b)
    );

    return [...enrichedResults, ...trailingLocalFallback];
  }

  triggerSearch() {
    clearTimeout(this.debounceTimer);
    this.ghostVideo = null;
    this.isLoadingMoreGhost = false;

    if (!this.isValidSearch(this.searchValue)) {
      this.invalidatePendingSearches();
      this.clearAllGhostPaginationState();
      this.activeSearchResults = [];
      this.filteredVideos = this.getBaseVideos();
      this.showRecentVideos = this.filteredVideos.length > 0;
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      const trimmedQuery = this.searchValue.trim();
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

      this.filteredVideos = [...this.activeSearchResults];

      if (this.showOnlyFavorites) {
        this.filteredVideos = this.filteredVideos.filter((video) => video.isFavorite);
      }

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

        const ghostPage = await this.fetchGhostVideosByArtist(
          trimmedQuery,
          { artistOffset: 0, titleOffset: 0 },
          ghostController.signal
        );

        if (ghostRequestId !== this.latestGhostRequestId) {
          return;
        }

        this.setGhostPaginationState(trimmedQuery, {
          artistOffset: ghostPage.nextArtistOffset,
          titleOffset: ghostPage.nextTitleOffset,
          hasMoreArtist: ghostPage.hasMoreArtist,
          hasMoreTitle: ghostPage.hasMoreTitle
        });

        this.activeSearchResults = this.filterPendingRecentDeletions(
          this.mergeGhostResults(this.activeSearchResults, ghostPage.results)
        );

        this.filteredVideos = this.showOnlyFavorites
          ? this.activeSearchResults.filter((video) => video.isFavorite)
          : [...this.activeSearchResults];

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
          this.filteredVideos = this.filterPendingRecentDeletions([this.ghostVideo]);
        }

        if (this.activeGhostController === ghostController) {
          this.activeGhostController = null;
        }

        this.isFetchingGhost = false;
      }

      this.showRecentVideos = this.filteredVideos.length > 0 || this.ghostVideo !== null;
    }, this.DEBOUNCE_DELAY);
  }

  async loadMoreGhostResults() {
    const query = this.searchValue.trim();
    if (!this.shouldFetchGhostByArtist(query) || this.isLoadingMoreGhost) {
      return;
    }

    const initialState = this.getGhostPaginationState(query);
    if (!initialState.hasMoreArtist && !initialState.hasMoreTitle) {
      this.canLoadMoreGhost = false;
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
      (state.hasMoreArtist || state.hasMoreTitle)
    ) {
      const page = await this.fetchGhostVideosByArtist(
        query,
        {
          artistOffset: state.artistOffset,
          titleOffset: state.titleOffset
        },
        ghostController.signal
      );

      if (ghostRequestId !== this.latestGhostRequestId) {
        return;
      }

      state = {
        artistOffset: page.nextArtistOffset,
        titleOffset: page.nextTitleOffset,
        hasMoreArtist: page.hasMoreArtist,
        hasMoreTitle: page.hasMoreTitle
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
      this.filteredVideos = this.showOnlyFavorites
        ? this.activeSearchResults.filter((video) => video.isFavorite)
        : [...this.activeSearchResults];
      this.showRecentVideos = this.filteredVideos.length > 0 || this.ghostVideo !== null;
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

    if (this.searchValue.trim()) {
      this.filteredVideos = this.searchVideos(this.searchValue);
      if (this.filteredVideos.length === 0 && this.ghostVideo) {
        this.filteredVideos = [this.ghostVideo];
      }
      this.showRecentVideos = this.filteredVideos.length > 0;
    } else {
      this.filteredVideos = this.getBaseVideos();
      this.showRecentVideos = this.filteredVideos.length > 0;
    }
  }

  async deleteRecentVideo(videoId: string) {
    if (this.pendingRecentDeletions.has(videoId)) {
      return;
    }

    if (!authStore.isAuthenticated) {
      await videoService.deleteRecentVideo(videoId);
      await this.loadRecentVideos();

      if (this.searchValue.trim()) {
        this.filteredVideos = this.searchVideos(this.searchValue);
      }

      return;
    }

    const previousRecentVideos = [...this.recentVideos];
    const previousFilteredVideos = [...this.filteredVideos];
    const previousShowRecentVideos = this.showRecentVideos;

    this.pendingRecentDeletions.add(videoId);
    this.recentVideos = this.recentVideos.filter((video) => video.videoId !== videoId);
    this.filteredVideos = this.filterPendingRecentDeletions(
      this.searchValue.trim() ? this.searchVideos(this.searchValue) : this.getBaseVideos()
    );
    this.showRecentVideos = this.filteredVideos.length > 0 || this.ghostVideo !== null;

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

    if (this.searchValue.trim()) {
      this.filteredVideos = this.showOnlyFavorites
        ? this.activeSearchResults.filter((video) => video.isFavorite)
        : [...this.activeSearchResults];

      this.showRecentVideos = this.filteredVideos.length > 0 || this.ghostVideo !== null;
      return;
    } else {
      this.filteredVideos = this.getBaseVideos();
    }

    this.showRecentVideos = this.filteredVideos.length > 0;
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
    this.canLoadMoreGhost = false;
    this.activeSearchResults = [];
    clearTimeout(this.debounceTimer);
    this.clearAllGhostPaginationState();
    this.invalidatePendingSearches();
  }
}

export const searchStore = new SearchStore();
