import type {
  FavoriteVideoImportInput,
  RecentVideoImportInput
} from '$lib/features/video/services/videoImportTypes';

export function normalizeRecentImports(
  recents: RecentVideoImportInput[]
): RecentVideoImportInput[] {
  const uniqueRecentsById = new Map<string, RecentVideoImportInput>();

  for (const recent of recents) {
    if (!recent.videoId || !recent.artist || !recent.track) {
      continue;
    }

    const existing = uniqueRecentsById.get(recent.videoId);
    if (!existing || recent.timestamp > existing.timestamp) {
      uniqueRecentsById.set(recent.videoId, recent);
    }
  }

  return Array.from(uniqueRecentsById.values());
}

export function normalizeFavoriteImports(
  favorites: FavoriteVideoImportInput[]
): FavoriteVideoImportInput[] {
  const uniqueFavoritesById = new Map<string, FavoriteVideoImportInput>();

  for (const favorite of favorites) {
    if (!favorite.videoId || !favorite.artist || !favorite.track) {
      continue;
    }

    const existing = uniqueFavoritesById.get(favorite.videoId);
    if (!existing || favorite.addedAt > existing.addedAt) {
      uniqueFavoritesById.set(favorite.videoId, favorite);
    }
  }

  return Array.from(uniqueFavoritesById.values());
}

export function collectImportVideoIds(
  recents: RecentVideoImportInput[],
  favorites: FavoriteVideoImportInput[]
): string[] {
  return Array.from(
    new Set([...recents.map((recent) => recent.videoId), ...favorites.map((fav) => fav.videoId)])
  );
}

export function computeMissingImports(
  recents: RecentVideoImportInput[],
  favorites: FavoriteVideoImportInput[],
  existingRecentIds: Set<string>,
  existingFavoriteIds: Set<string>
): {
  missingRecents: RecentVideoImportInput[];
  missingFavorites: FavoriteVideoImportInput[];
  skippedExisting: number;
} {
  const missingRecents = recents.filter((recent) => !existingRecentIds.has(recent.videoId));
  const missingFavorites = favorites.filter(
    (favorite) => !existingFavoriteIds.has(favorite.videoId)
  );

  return {
    missingRecents,
    missingFavorites,
    skippedExisting:
      recents.length + favorites.length - missingRecents.length - missingFavorites.length
  };
}
