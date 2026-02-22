export interface RecentVideoImportInput {
  videoId: string;
  artist: string;
  track: string;
  thumbnailUrl?: string;
  timestamp: number;
}

export interface FavoriteVideoImportInput {
  videoId: string;
  artist: string;
  track: string;
  thumbnailUrl?: string;
  addedAt: number;
}

export interface VideoImportPayload {
  recents: RecentVideoImportInput[];
  favorites: FavoriteVideoImportInput[];
}

export interface VideoImportResult {
  importedRecents: number;
  importedFavorites: number;
  skippedExisting: number;
  failed: number;
}
