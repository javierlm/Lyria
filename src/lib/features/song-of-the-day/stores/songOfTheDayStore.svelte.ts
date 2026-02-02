/**
 * Store for Song of the Day official data.
 * Persists official artist/track to sessionStorage for use during playback.
 * Prevents the need to pass sensitive data via URL parameters.
 */

import type { SongOfTheDayDisplay } from '../domain/SongOfTheDay';

const STORAGE_KEY = 'lyria-song-of-day-official';

/**
 * Store for official Song of the Day metadata.
 * Used to pass correct artist/track to the player without URL params.
 */
class SongOfTheDayStore {
  /**
   * Current official song of the day data from API.
   * Includes artist and track names from Wikidata (authoritative source).
   */
  officialData = $state<SongOfTheDayDisplay | null>(null);

  /**
   * Video ID of the currently stored official data.
   * Used to verify data matches the video being played.
   */
  get currentVideoId(): string | null {
    return this.officialData?.videoId || null;
  }

  constructor() {
    // Restore from sessionStorage on initialization
    this.restoreFromStorage();
  }

  /**
   * Saves official song data before navigation.
   * Called when user clicks on SongOfTheDayCard.
   */
  saveOfficialData(data: SongOfTheDayDisplay): void {
    this.officialData = data;
    this.persistToStorage();
  }

  /**
   * Retrieves official artist/track for a specific video.
   * Returns null if no official data exists or videoId doesn't match.
   */
  getOfficialDataForVideo(videoId: string): { artist: string; track: string } | null {
    if (this.officialData?.videoId !== videoId) {
      return null;
    }

    return {
      artist: this.officialData.artist,
      track: this.officialData.track
    };
  }

  /**
   * Clears stored official data.
   * Called when user navigates away from song of the day.
   */
  clearOfficialData(): void {
    this.officialData = null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Persists current official data to sessionStorage.
   * Allows recovery after page refresh.
   */
  private persistToStorage(): void {
    if (typeof sessionStorage === 'undefined' || !this.officialData) {
      return;
    }

    try {
      const dataToStore = {
        ...this.officialData,
        // Add timestamp to check freshness
        storedAt: Date.now()
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to persist song of day to sessionStorage:', error);
    }
  }

  /**
   * Restores official data from sessionStorage on initialization.
   * Validates that data is not stale (older than 24 hours).
   */
  private restoreFromStorage(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as SongOfTheDayDisplay & { storedAt: number };

      // Validate data is not stale (older than 24 hours)
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.storedAt > oneDayMs) {
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Restore official data (without timestamp)
      const { ...officialData } = parsed;
      this.officialData = officialData;
    } catch (error) {
      console.warn('Failed to restore song of day from sessionStorage:', error);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}

export const songOfTheDayStore = new SongOfTheDayStore();
