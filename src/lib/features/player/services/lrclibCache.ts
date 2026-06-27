export interface SearchResolutionCacheValue {
  lyricId: number;
}

export function normalizeArtistHintForCache(artistHint?: string): string {
  return artistHint ? artistHint.trim().toLowerCase().replace(/\s+/g, ' ') : 'none';
}

export function buildLyricCacheKey(id: number): string {
  return `lrclib:lyric:${id}`;
}

export function buildSearchCacheKey(url: string, artistHint?: string): string {
  return `lrclib:search:${url}:artistHint=${normalizeArtistHintForCache(artistHint)}`;
}
