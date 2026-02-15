import { videoService } from '$lib/features/video/services/videoService';
import type { RecentVideo } from '$lib/features/video/domain/IVideoRepository';
import { extractVideoId } from '$lib/shared/utils';
import { SvelteMap } from 'svelte/reactivity';

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

class SearchStore {
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
    if (!query.trim() || query.trim().length < 2) {
      return this.getBaseVideos();
    }

    const lowerQuery = query.toLowerCase().trim();
    const videoId = extractVideoId(query);

    if (videoId) {
      return this.recentVideos.filter((video) => video.videoId === videoId);
    }

    const baseVideos = this.getBaseVideos();
    const searchTerms = lowerQuery.split(/\s+/).filter((term) => term.length > 0);

    if (searchTerms.length === 0) {
      return baseVideos;
    }

    return baseVideos.filter((video) => {
      const combinedText = `${video.artist?.toLowerCase() || ''} ${video.track?.toLowerCase() || ''}`;
      return searchTerms.every((term) => combinedText.includes(term));
    });
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
          source: result.isRecent ? 'user-recent' : result.isFavorite ? 'user-favorite' : 'catalog'
        };
      });
    } catch (error) {
      console.error('Failed to search videos from API:', error);
      return [];
    }
  }

  triggerSearch() {
    clearTimeout(this.debounceTimer);
    this.ghostVideo = null;

    if (!this.searchValue.trim()) {
      this.filteredVideos = this.getBaseVideos();
      this.showRecentVideos = this.filteredVideos.length > 0;
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      this.filteredVideos = await this.searchGlobalVideos(this.searchValue);

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
        source: 'user-recent'
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
