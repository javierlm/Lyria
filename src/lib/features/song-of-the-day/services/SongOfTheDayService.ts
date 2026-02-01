import type { SongOfTheDayStored, SongOfTheDayDisplay } from '../domain/SongOfTheDay';
import { SongOfTheDayCache } from './SongOfTheDayCache';
import { SongOfTheDaySelector } from './SongOfTheDaySelector';

export class SongOfTheDayService {
  private readonly cache: SongOfTheDayCache;
  private readonly selector: SongOfTheDaySelector;

  constructor() {
    this.cache = new SongOfTheDayCache();
    this.selector = new SongOfTheDaySelector();
  }

  /**
   * Update the song of the day (called by cron job)
   * This is the slow operation that queries external services
   */
  async updateSongOfTheDay(): Promise<SongOfTheDayStored | null> {
    console.log('🎵 Starting Song of the Day update...');

    const song = await this.selector.selectSong();

    if (song) {
      await this.cache.set(song);
      console.log('✅ Song of the day updated:', song.track, 'by', song.artist, `(${song.year})`);
    } else {
      console.error('❌ Failed to find any song for today');
    }

    return song;
  }

  /**
   * Get the current song of the day - ULTRA FAST
   * Just reads from cache, no external calls
   */
  async getSongOfTheDay(): Promise<SongOfTheDayDisplay | null> {
    const stored = await this.cache.get();

    if (!stored) {
      return null;
    }

    // Fast response - just add today's date
    const today = new Date();
    return {
      videoId: stored.videoId,
      artist: stored.artist,
      track: stored.track,
      year: stored.year,
      date: today.toISOString().split('T')[0]
    };
  }

  /**
   * Clear the current song (for testing)
   */
  async clearSong(): Promise<void> {
    await this.cache.clear();
    console.log('🗑️ Song of the day cleared');
  }
}
