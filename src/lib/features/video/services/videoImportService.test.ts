import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./indexedDB', () => ({
  indexedDBVideoRepository: {
    getRecentVideos: vi.fn(),
    getFavoriteVideos: vi.fn()
  }
}));

vi.mock('./ApiVideoRepository', () => ({
  apiVideoRepository: {
    getRecentVideos: vi.fn(),
    getFavoriteVideos: vi.fn(),
    importVideos: vi.fn()
  }
}));

import { getImportCandidateCounts, importMissingVideosFromIndexedDB } from './videoImportService';
import { indexedDBVideoRepository } from './indexedDB';
import { apiVideoRepository } from './ApiVideoRepository';

describe('videoImportService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('computes candidate counts for missing recents and favorites', async () => {
    vi.mocked(indexedDBVideoRepository.getRecentVideos).mockResolvedValue([
      {
        videoId: 'recent-missing',
        artist: 'Artist A',
        track: 'Track A',
        timestamp: 100
      },
      {
        videoId: 'recent-existing',
        artist: 'Artist B',
        track: 'Track B',
        timestamp: 200
      }
    ]);

    vi.mocked(indexedDBVideoRepository.getFavoriteVideos).mockResolvedValue([
      {
        videoId: 'fav-missing',
        artist: 'Artist C',
        track: 'Track C',
        timestamp: 300,
        addedAt: 300
      },
      {
        videoId: 'fav-existing',
        artist: 'Artist D',
        track: 'Track D',
        timestamp: 400,
        addedAt: 400
      }
    ]);

    vi.mocked(apiVideoRepository.getRecentVideos).mockResolvedValue([
      {
        videoId: 'recent-existing',
        artist: 'Artist B',
        track: 'Track B',
        timestamp: 200
      }
    ]);

    vi.mocked(apiVideoRepository.getFavoriteVideos).mockResolvedValue([
      {
        videoId: 'fav-existing',
        artist: 'Artist D',
        track: 'Track D',
        timestamp: 400,
        addedAt: 400
      }
    ]);

    const result = await getImportCandidateCounts();

    expect(result).toEqual({ missingRecents: 1, missingFavorites: 1 });
  });

  it('imports only missing records and keeps existing untouched', async () => {
    vi.mocked(indexedDBVideoRepository.getRecentVideos).mockResolvedValue([
      {
        videoId: 'recent-existing',
        artist: 'Artist B',
        track: 'Track B',
        timestamp: 200
      },
      {
        videoId: 'recent-missing',
        artist: 'Artist A',
        track: 'Track A',
        timestamp: 100,
        thumbnailUrl: 'thumb-a'
      }
    ]);

    vi.mocked(indexedDBVideoRepository.getFavoriteVideos).mockResolvedValue([
      {
        videoId: 'fav-existing',
        artist: 'Artist D',
        track: 'Track D',
        timestamp: 400,
        addedAt: 400
      },
      {
        videoId: 'fav-missing',
        artist: 'Artist C',
        track: 'Track C',
        timestamp: 300,
        addedAt: 300,
        thumbnailUrl: 'thumb-c'
      }
    ]);

    vi.mocked(apiVideoRepository.getRecentVideos).mockResolvedValue([
      {
        videoId: 'recent-existing',
        artist: 'Artist B',
        track: 'Track B',
        timestamp: 200
      }
    ]);

    vi.mocked(apiVideoRepository.getFavoriteVideos).mockResolvedValue([
      {
        videoId: 'fav-existing',
        artist: 'Artist D',
        track: 'Track D',
        timestamp: 400,
        addedAt: 400
      }
    ]);

    vi.mocked(apiVideoRepository.importVideos).mockResolvedValue({
      importedRecents: 1,
      importedFavorites: 1,
      skippedExisting: 0,
      failed: 0
    });

    const result = await importMissingVideosFromIndexedDB();

    expect(result).toEqual({
      importedRecents: 1,
      importedFavorites: 1,
      skippedExisting: 2,
      failed: 0
    });

    expect(apiVideoRepository.importVideos).toHaveBeenCalledTimes(1);
    expect(apiVideoRepository.importVideos).toHaveBeenCalledWith({
      recents: [
        {
          videoId: 'recent-missing',
          artist: 'Artist A',
          track: 'Track A',
          thumbnailUrl: 'thumb-a',
          timestamp: 100
        }
      ],
      favorites: [
        {
          videoId: 'fav-missing',
          artist: 'Artist C',
          track: 'Track C',
          thumbnailUrl: 'thumb-c',
          addedAt: 300
        }
      ]
    });
  });

  it('reports all missing as failed when bulk import request fails', async () => {
    vi.mocked(indexedDBVideoRepository.getRecentVideos).mockResolvedValue([
      {
        videoId: 'recent-fail',
        artist: 'Artist A',
        track: 'Track A',
        timestamp: 100
      },
      {
        videoId: 'recent-ok',
        artist: 'Artist B',
        track: 'Track B',
        timestamp: 200
      }
    ]);

    vi.mocked(indexedDBVideoRepository.getFavoriteVideos).mockResolvedValue([
      {
        videoId: 'fav-fail',
        artist: 'Artist C',
        track: 'Track C',
        timestamp: 300,
        addedAt: 300
      }
    ]);
    vi.mocked(apiVideoRepository.getRecentVideos).mockResolvedValue([]);
    vi.mocked(apiVideoRepository.getFavoriteVideos).mockResolvedValue([]);
    vi.mocked(apiVideoRepository.importVideos).mockRejectedValue(new Error('boom'));

    const result = await importMissingVideosFromIndexedDB();

    expect(result).toEqual({
      importedRecents: 0,
      importedFavorites: 0,
      skippedExisting: 0,
      failed: 3
    });
  });
});
