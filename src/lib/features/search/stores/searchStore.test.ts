import { describe, it, expect, beforeEach } from 'vitest';
import { SearchStore } from './searchStore.svelte';
import type { VideoItem } from './searchStore.svelte';

type SearchStoreTestAccess = {
  enrichWithLocalData(globalResults: VideoItem[], query: string): VideoItem[];
  mergeGhostResults(baseResults: VideoItem[], ghostResults: VideoItem[]): VideoItem[];
};

function getTestAccess(store: SearchStore): SearchStoreTestAccess {
  return store as unknown as SearchStoreTestAccess;
}

describe('SearchStore - enrichWithLocalData', () => {
  let store: SearchStore;

  beforeEach(() => {
    store = new SearchStore();
    // Mock recentVideos with local data
    store.recentVideos = [
      {
        videoId: 'local-fav-1',
        artist: 'Metallica',
        track: 'Enter Sandman',
        thumbnailUrl: 'https://example.com/1.jpg',
        timestamp: 1000,
        isFavorite: true,
        source: 'user-favorite'
      },
      {
        videoId: 'local-recent-1',
        artist: 'Nirvana',
        track: 'Smells Like Teen Spirit',
        thumbnailUrl: 'https://example.com/2.jpg',
        timestamp: 2000,
        isFavorite: false,
        source: 'user-recent'
      },
      {
        videoId: 'local-recent-2',
        artist: 'Linkin Park',
        track: 'Numb',
        thumbnailUrl: 'https://example.com/3.jpg',
        timestamp: 3000,
        isFavorite: false,
        source: 'user-recent'
      }
    ];
  });

  describe('Global result exists locally as favorite', () => {
    it('should show as user-favorite with correct metadata', () => {
      const globalResults: VideoItem[] = [
        {
          videoId: 'local-fav-1',
          artist: 'Metallica',
          track: 'Enter Sandman',
          thumbnailUrl: 'https://global.com/1.jpg',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'metallica');

      expect(enriched).toHaveLength(1);
      expect(enriched[0].source).toBe('user-favorite');
      expect(enriched[0].isFavorite).toBe(true);
      expect(enriched[0].timestamp).toBe(1000);
    });
  });

  describe('Global result exists locally as recent', () => {
    it('should show as user-recent with correct metadata', () => {
      const globalResults: VideoItem[] = [
        {
          videoId: 'local-recent-1',
          artist: 'Nirvana',
          track: 'Smells Like Teen Spirit',
          thumbnailUrl: 'https://global.com/2.jpg',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'nirvana');

      expect(enriched).toHaveLength(1);
      expect(enriched[0].source).toBe('user-recent');
      expect(enriched[0].isFavorite).toBe(false);
      expect(enriched[0].timestamp).toBe(2000);
    });

    it('should treat timestamp 0 as user-recent', () => {
      store.recentVideos = [
        {
          videoId: 'local-recent-zero',
          artist: 'Muse',
          track: 'Uprising',
          thumbnailUrl: 'https://example.com/zero.jpg',
          timestamp: 0,
          isFavorite: false,
          source: 'user-recent'
        }
      ];

      const globalResults: VideoItem[] = [
        {
          videoId: 'local-recent-zero',
          artist: 'Muse',
          track: 'Uprising',
          thumbnailUrl: 'https://global.com/zero.jpg',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'muse');

      expect(enriched).toHaveLength(1);
      expect(enriched[0].source).toBe('user-recent');
      expect(enriched[0].timestamp).toBe(0);
    });
  });

  describe('Global result does not exist locally', () => {
    it('should remain as catalog with global metadata', () => {
      const globalResults: VideoItem[] = [
        {
          videoId: 'global-only-1',
          artist: 'Led Zeppelin',
          track: 'Stairway to Heaven',
          thumbnailUrl: 'https://global.com/4.jpg',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'zeppelin');

      expect(enriched).toHaveLength(1);
      expect(enriched[0].source).toBe('catalog');
      expect(enriched[0].isFavorite).toBe(false);
      expect(enriched[0].timestamp).toBeNull();
    });
  });

  describe('Local video matches search but not in global results', () => {
    it('should include local matching video in results', () => {
      const globalResults: VideoItem[] = [
        {
          videoId: 'global-only-1',
          artist: 'Led Zeppelin',
          track: 'Stairway to Heaven',
          thumbnailUrl: 'https://global.com/4.jpg',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'linkin');

      // Should have global result + local matching video
      expect(enriched).toHaveLength(2);

      const localVideo = enriched.find((v: VideoItem) => v.videoId === 'local-recent-2');
      expect(localVideo).toBeDefined();
      expect(localVideo?.source).toBe('user-recent');
    });

    it('should include local result for a single-word typo', () => {
      store.recentVideos.push({
        videoId: 'local-utopia-1',
        artist: 'Epica',
        track: 'Unchain Utopia',
        thumbnailUrl: 'https://example.com/utopia.jpg',
        timestamp: 3500,
        isFavorite: false,
        source: 'user-recent'
      });

      const enriched = getTestAccess(store).enrichWithLocalData([], 'utopa');

      expect(enriched.some((v: VideoItem) => v.videoId === 'local-utopia-1')).toBe(true);
    });
  });

  describe('Sorting priority', () => {
    it('should sort favorites first, then recents, then catalog', () => {
      const globalResults: VideoItem[] = [
        {
          videoId: 'global-1',
          artist: 'Global Artist',
          track: 'Global Track',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        },
        {
          videoId: 'local-recent-1',
          artist: 'Nirvana',
          track: 'Smells Like Teen Spirit',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        },
        {
          videoId: 'local-fav-1',
          artist: 'Metallica',
          track: 'Enter Sandman',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'test');

      expect(enriched[0].source).toBe('user-favorite');
      expect(enriched[1].source).toBe('user-recent');
      expect(enriched[2].source).toBe('catalog');
    });

    it('should sort by timestamp within same priority', () => {
      // Add another recent video with different timestamp
      store.recentVideos.push({
        videoId: 'local-recent-3',
        artist: 'AC/DC',
        track: 'Thunderstruck',
        thumbnailUrl: 'https://example.com/4.jpg',
        timestamp: 1500, // Between local-recent-1 (2000) and local-recent-2 (3000)
        isFavorite: false,
        source: 'user-recent'
      });

      const globalResults: VideoItem[] = [
        {
          videoId: 'local-recent-2',
          artist: 'Linkin Park',
          track: 'Numb',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        },
        {
          videoId: 'local-recent-3',
          artist: 'AC/DC',
          track: 'Thunderstruck',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        },
        {
          videoId: 'local-recent-1',
          artist: 'Nirvana',
          track: 'Smells Like Teen Spirit',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'test');

      const recents = enriched.filter((v: VideoItem) => v.source === 'user-recent');
      expect(recents[0].videoId).toBe('local-recent-2'); // timestamp 3000
      expect(recents[1].videoId).toBe('local-recent-1'); // timestamp 2000
      expect(recents[2].videoId).toBe('local-recent-3'); // timestamp 1500
    });
  });

  describe('Anonymous user scenario', () => {
    it('should correctly identify local favorites even when global says catalog', () => {
      // Simulating: User is anonymous (no server session)
      // Global API returns video as catalog (isFavorite: false, isRecent: false)
      // But locally it's a favorite
      const globalResults: VideoItem[] = [
        {
          videoId: 'local-fav-1',
          artist: 'Metallica',
          track: 'Enter Sandman',
          thumbnailUrl: 'https://global.com/1.jpg',
          timestamp: null,
          isFavorite: false, // Global says not favorite
          source: 'catalog' // Global says catalog
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'metallica');

      // Should show as favorite based on local data
      expect(enriched[0].source).toBe('user-favorite');
      expect(enriched[0].isFavorite).toBe(true);
    });

    it('should correctly identify local recents even when global says catalog', () => {
      const globalResults: VideoItem[] = [
        {
          videoId: 'local-recent-1',
          artist: 'Nirvana',
          track: 'Smells Like Teen Spirit',
          thumbnailUrl: 'https://global.com/2.jpg',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'nirvana');

      expect(enriched[0].source).toBe('user-recent');
      expect(enriched[0].timestamp).toBe(2000);
    });
  });

  describe('Empty results handling', () => {
    it('should handle empty global results with local matches', () => {
      const globalResults: VideoItem[] = [];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'linkin');

      expect(enriched.length).toBeGreaterThan(0);
      expect(enriched.some((v: VideoItem) => v.videoId === 'local-recent-2')).toBe(true);
    });

    it('should handle no matching local videos', () => {
      const globalResults: VideoItem[] = [
        {
          videoId: 'global-1',
          artist: 'Led Zeppelin',
          track: 'Stairway to Heaven',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'zeppelin');

      expect(enriched).toHaveLength(1);
      expect(enriched[0].videoId).toBe('global-1');
    });
  });

  describe('Video with both favorite and recent status', () => {
    it('should prioritize favorite status over recent', () => {
      // Create a video that is both in favorites and recents locally
      store.recentVideos = [
        {
          videoId: 'both-status',
          artist: 'Queen',
          track: 'Bohemian Rhapsody',
          thumbnailUrl: 'https://example.com/5.jpg',
          timestamp: 5000,
          isFavorite: true, // It's a favorite
          source: 'user-favorite'
        }
      ];

      const globalResults: VideoItem[] = [
        {
          videoId: 'both-status',
          artist: 'Queen',
          track: 'Bohemian Rhapsody',
          thumbnailUrl: 'https://global.com/5.jpg',
          timestamp: null,
          isFavorite: false,
          source: 'catalog'
        }
      ];

      const enriched = getTestAccess(store).enrichWithLocalData(globalResults, 'queen');

      expect(enriched[0].source).toBe('user-favorite');
      expect(enriched[0].isFavorite).toBe(true);
      expect(enriched[0].timestamp).toBe(5000);
    });
  });

  describe('Ghost result merging', () => {
    it('should append ghost results that are not in base results', () => {
      const baseResults: VideoItem[] = [
        {
          videoId: 'base-1',
          artist: 'Linkin Park',
          track: 'Numb',
          source: 'catalog'
        }
      ];

      const ghostResults: VideoItem[] = [
        {
          videoId: 'ghost-1',
          artist: 'Linkin Park',
          track: 'In the End',
          isGhost: true,
          source: 'ghost'
        }
      ];

      const merged = getTestAccess(store).mergeGhostResults(baseResults, ghostResults);

      expect(merged).toHaveLength(2);
      expect(merged[0]?.videoId).toBe('base-1');
      expect(merged[1]?.videoId).toBe('ghost-1');
    });

    it('should not duplicate entries when ghost video already exists in base results', () => {
      const baseResults: VideoItem[] = [
        {
          videoId: 'dup-1',
          artist: 'Linkin Park',
          track: 'Numb',
          source: 'catalog'
        }
      ];

      const ghostResults: VideoItem[] = [
        {
          videoId: 'dup-1',
          artist: 'Linkin Park',
          track: 'Numb',
          isGhost: true,
          source: 'ghost'
        }
      ];

      const merged = getTestAccess(store).mergeGhostResults(baseResults, ghostResults);

      expect(merged).toHaveLength(1);
      expect(merged[0]?.videoId).toBe('dup-1');
      expect(merged[0]?.source).toBe('catalog');
    });
  });
});
