import type { FavoriteVideo, RecentVideo } from '$lib/features/video/domain/IVideoRepository';
import { indexedDBVideoRepository } from './indexedDB';
import { apiVideoRepository } from './ApiVideoRepository';
import type { VideoImportPayload, VideoImportResult } from './videoImportTypes';

function getMissingByVideoId<T extends { videoId: string }>(
  localItems: T[],
  remoteIds: Set<string>
): T[] {
  return localItems.filter((item) => !remoteIds.has(item.videoId));
}

async function getLocalData(): Promise<{ recents: RecentVideo[]; favorites: FavoriteVideo[] }> {
  const [recents, favorites] = await Promise.all([
    indexedDBVideoRepository.getRecentVideos(),
    indexedDBVideoRepository.getFavoriteVideos()
  ]);

  return { recents, favorites };
}

async function getRemoteData(): Promise<{ recents: RecentVideo[]; favorites: FavoriteVideo[] }> {
  const [recents, favorites] = await Promise.all([
    apiVideoRepository.getRecentVideos(),
    apiVideoRepository.getFavoriteVideos()
  ]);

  return { recents, favorites };
}

export async function getImportCandidateCounts(): Promise<{
  missingRecents: number;
  missingFavorites: number;
}> {
  const [
    { recents: localRecents, favorites: localFavorites },
    { recents: remoteRecents, favorites: remoteFavorites }
  ] = await Promise.all([getLocalData(), getRemoteData()]);

  const remoteRecentIds = new Set(remoteRecents.map((video) => video.videoId));
  const remoteFavoriteIds = new Set(remoteFavorites.map((video) => video.videoId));

  return {
    missingRecents: getMissingByVideoId(localRecents, remoteRecentIds).length,
    missingFavorites: getMissingByVideoId(localFavorites, remoteFavoriteIds).length
  };
}

export async function importMissingVideosFromIndexedDB(): Promise<VideoImportResult> {
  const [
    { recents: localRecents, favorites: localFavorites },
    { recents: remoteRecents, favorites: remoteFavorites }
  ] = await Promise.all([getLocalData(), getRemoteData()]);

  const remoteRecentIds = new Set(remoteRecents.map((video) => video.videoId));
  const remoteFavoriteIds = new Set(remoteFavorites.map((video) => video.videoId));

  const missingRecents = getMissingByVideoId(localRecents, remoteRecentIds);
  const missingFavorites = getMissingByVideoId(localFavorites, remoteFavoriteIds);

  const payload: VideoImportPayload = {
    recents: missingRecents.map((recent) => ({
      videoId: recent.videoId,
      artist: recent.artist,
      track: recent.track,
      thumbnailUrl: recent.thumbnailUrl,
      timestamp: recent.timestamp
    })),
    favorites: missingFavorites.map((favorite) => ({
      videoId: favorite.videoId,
      artist: favorite.artist,
      track: favorite.track,
      thumbnailUrl: favorite.thumbnailUrl,
      addedAt: favorite.addedAt
    }))
  };

  try {
    const result = await apiVideoRepository.importVideos(payload);

    return {
      importedRecents: result.importedRecents,
      importedFavorites: result.importedFavorites,
      skippedExisting:
        localRecents.length +
        localFavorites.length -
        missingRecents.length -
        missingFavorites.length,
      skippedByLimit: result.skippedByLimit,
      failed: result.failed
    };
  } catch (error) {
    console.error('[videoImportService] Bulk import failed:', error);

    return {
      importedRecents: 0,
      importedFavorites: 0,
      skippedExisting:
        localRecents.length +
        localFavorites.length -
        missingRecents.length -
        missingFavorites.length,
      skippedByLimit: 0,
      failed: missingRecents.length + missingFavorites.length
    };
  }
}
