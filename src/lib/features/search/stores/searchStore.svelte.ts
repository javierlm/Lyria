import { videoService } from '$lib/features/video/services/videoService';
import { extractVideoId } from '$lib/shared/utils';
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

export class SearchStore {
  showSearchField = $state(false);
  showRecentVideos = $state(false);
  recentVideos: VideoItem[] = $state([]);
  filteredVideos: VideoItem[] = $state([]);
  searchValue = $state('');
  ghostVideo: VideoItem | null = $state(null);
  isFetchingGhost = $state(false);
  showOnlyFavorites = $state(false);
  isKeyboardOpen = $state(false);

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly DEBOUNCE_DELAY = 300;
  private readonly MIN_SEARCH_LENGTH = 3;
  private readonly SINGLE_TERM_FUZZY_MIN_LENGTH = 4;
  private readonly SINGLE_TERM_FUZZY_MAX_DISTANCE = 1;

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

  private shouldUseSingleTermFuzzy(searchTerms: string[]): boolean {
    if (searchTerms.length !== 1) {
      return false;
    }

    const normalizedTerm = this.normalizeToken(searchTerms[0]);
    return normalizedTerm.length >= this.SINGLE_TERM_FUZZY_MIN_LENGTH;
  }

  private levenshteinDistance(a: string, b: string, maxDistance: number): number {
    if (a === b) {
      return 0;
    }

    if (Math.abs(a.length - b.length) > maxDistance) {
      return maxDistance + 1;
    }

    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i++) {
      let diagonal = previous[0];
      previous[0] = i;

      let left = i;
      let smallestInRow = left;

      for (let j = 1; j <= b.length; j++) {
        const up = previous[j];
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
        const value = Math.min(up + 1, left + 1, diagonal + substitutionCost);

        diagonal = up;
        previous[j] = value;
        left = value;

        if (value < smallestInRow) {
          smallestInRow = value;
        }
      }

      if (smallestInRow > maxDistance) {
        return maxDistance + 1;
      }
    }

    return previous[b.length];
  }

  private isSingleTermFuzzyMatch(searchTerm: string, candidate: string): boolean {
    if (candidate.includes(searchTerm)) {
      return true;
    }

    return (
      this.levenshteinDistance(searchTerm, candidate, this.SINGLE_TERM_FUZZY_MAX_DISTANCE) <=
      this.SINGLE_TERM_FUZZY_MAX_DISTANCE
    );
  }

  private matchesSearch(
    video: Pick<VideoItem, 'artist' | 'track'>,
    searchTerms: string[]
  ): boolean {
    const searchableText = this.buildSearchableText(video);

    if (searchTerms.every((term) => searchableText.includes(term))) {
      return true;
    }

    if (!this.shouldUseSingleTermFuzzy(searchTerms)) {
      return false;
    }

    const fuzzyTerm = this.normalizeToken(searchTerms[0]);
    if (!fuzzyTerm) {
      return false;
    }

    return this.tokenizeSearchableText(searchableText).some((token) =>
      this.isSingleTermFuzzyMatch(fuzzyTerm, token)
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

  constructor() {}

  setCentered(centered: boolean) {
    this.showSearchField = centered;
  }

  async fetchVideoInfo(videoId: string): Promise<{ title: string; author: string } | null> {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (!response.ok) return null;
      const data = await response.json();
      return {
        title: data.title || '',
        author: data.author_name || ''
      };
    } catch (error) {
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
      return this.recentVideos.filter((video) => video.videoId === videoId);
    }

    const baseVideos = this.getBaseVideos();
    const searchTerms = this.getSearchTerms(query);

    if (searchTerms.length === 0) {
      return baseVideos;
    }

    return baseVideos.filter((video) => this.matchesSearch(video, searchTerms));
  }

  async searchGlobalVideos(query: string): Promise<VideoItem[]> {
    try {
      const response = await fetch(`/api/search/videos?q=${encodeURIComponent(query)}&limit=30`);
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

    return [...enrichedResults, ...matchingLocalVideos].sort((a, b) =>
      this.compareBySourceAndTimestamp(a, b)
    );
  }

  triggerSearch() {
    clearTimeout(this.debounceTimer);
    this.ghostVideo = null;

    if (!this.isValidSearch(this.searchValue)) {
      this.filteredVideos = this.getBaseVideos();
      this.showRecentVideos = this.filteredVideos.length > 0;
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      const trimmedQuery = this.searchValue.trim();
      const globalResults = await this.searchGlobalVideos(trimmedQuery);

      // Enrich with local data (handles anonymous users with local favorites/recents)
      this.filteredVideos = this.enrichWithLocalData(globalResults, trimmedQuery);

      if (this.showOnlyFavorites) {
        this.filteredVideos = this.filteredVideos.filter((video) => video.isFavorite);
      }

      const videoId = extractVideoId(this.searchValue);
      if (videoId && this.filteredVideos.length === 0 && !this.isFetchingGhost) {
        this.isFetchingGhost = true;
        const videoInfo = await this.fetchVideoInfo(videoId);
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
          this.filteredVideos = [this.ghostVideo];
        }
        this.isFetchingGhost = false;
      }

      this.showRecentVideos = this.filteredVideos.length > 0 || this.ghostVideo !== null;
    }, this.DEBOUNCE_DELAY);
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

    this.recentVideos = Array.from(videoMap.values()).sort(
      (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
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
    await videoService.deleteRecentVideo(videoId);
    await this.loadRecentVideos();

    if (this.searchValue.trim()) {
      this.filteredVideos = this.searchVideos(this.searchValue);
    }
  }

  toggleFavoritesFilter() {
    this.showOnlyFavorites = !this.showOnlyFavorites;

    if (this.searchValue.trim()) {
      this.filteredVideos = this.searchVideos(this.searchValue);
    } else {
      this.filteredVideos = this.getBaseVideos();
    }

    this.showRecentVideos = this.filteredVideos.length > 0;
  }

  getBaseVideos() {
    return this.showOnlyFavorites
      ? this.recentVideos.filter((v) => v.isFavorite)
      : this.recentVideos;
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
    clearTimeout(this.debounceTimer);
  }
}

export const searchStore = new SearchStore();
