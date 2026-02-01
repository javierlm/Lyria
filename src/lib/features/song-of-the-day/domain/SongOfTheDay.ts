/**
 * Minimal storage structure for Song of the Day
 * Stored in KV/file - must be fast to retrieve
 */
export interface SongOfTheDayStored {
  videoId: string;
  artist: string;
  track: string;
  year: number;
}

/**
 * Display information for UI
 * Fast retrieval - no external calls needed
 */
export interface SongOfTheDayDisplay extends SongOfTheDayStored {
  date: string;
}

/**
 * Result from Wikidata SPARQL query
 */
export interface WikidataSong {
  singleId: string;
  title: string;
  artistId: string;
  artistName: string;
  date: string;
  year: number;
  videoId: string;
}

export interface WikidataBindingValue {
  value: string;
}

export interface WikidataBinding {
  single?: WikidataBindingValue;
  singleLabel?: WikidataBindingValue;
  artist?: WikidataBindingValue;
  artistLabel?: WikidataBindingValue;
  date?: WikidataBindingValue;
  year?: WikidataBindingValue;
  videoId?: WikidataBindingValue;
}

export interface WikidataResponse {
  results?: {
    bindings: WikidataBinding[];
  };
}

/**
 * Result from LRCLib lyrics check
 */
export interface LyricsCheckResult {
  hasLyrics: boolean;
  type: 'synced' | 'plain' | 'none';
  lrclibId?: number;
  trackName?: string;
  artistName?: string;
}

/**
 * Fallback song for when Wikidata has no results
 */
export interface FallbackSong {
  videoId: string;
  artist: string;
  track: string;
  year: number;
  language: string;
}

/**
 * Priority levels for song selection
 */
export type SongPriority = 'wikidata-synced' | 'wikidata-plain' | 'wikidata-none';
