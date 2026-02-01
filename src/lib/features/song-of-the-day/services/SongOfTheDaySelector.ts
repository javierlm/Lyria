import type { SongOfTheDayStored, WikidataSong, LyricsCheckResult } from '../domain/SongOfTheDay';
import { WikidataMusicService } from './WikidataMusicService';
import { LrcLibCheckerService } from './LrcLibCheckerService';

interface CandidateSong {
  song: WikidataSong;
  lyricsResult: LyricsCheckResult;
  priority: number;
}

export class SongOfTheDaySelector {
  private readonly wikidataService: WikidataMusicService;
  private readonly lrcLibService: LrcLibCheckerService;

  constructor() {
    this.wikidataService = new WikidataMusicService();
    this.lrcLibService = new LrcLibCheckerService();
  }

  /**
   * Select the best song for today based on priority:
   * 1. Wikidata song with synced lyrics
   * 2. Wikidata song with plain lyrics
   * 5. Any song from Wikidata (no lyrics)
   */
  async selectSong(): Promise<SongOfTheDayStored | null> {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const currentYear = today.getFullYear();

    console.log(`🎯 Selecting song for ${month}/${day} (excluding ${currentYear})`);

    // Get candidates from Wikidata
    const wikidataSongs = await this.wikidataService.getSongsByAnniversary(month, day, currentYear);

    console.log(`📊 Found ${wikidataSongs.length} songs from Wikidata`);

    // Check lyrics for each Wikidata song
    const candidates: CandidateSong[] = [];
    for (const song of wikidataSongs) {
      const lyricsResult = await this.lrcLibService.checkLyrics(song.artistName, song.title);

      // Priority: synced (1) > plain (2) > none (5)
      let priority = 5;
      if (lyricsResult.type === 'synced') priority = 1;
      else if (lyricsResult.type === 'plain') priority = 2;

      candidates.push({ song, lyricsResult, priority });
    }

    // Sort by priority (lower is better)
    candidates.sort((a, b) => a.priority - b.priority);

    // Try to find the best Wikidata song
    const bestSynced = candidates.find((c) => c.lyricsResult.type === 'synced');
    const bestPlain = candidates.find((c) => c.lyricsResult.type === 'plain');
    const anyWikidata = candidates[0];

    if (bestSynced) {
      console.log(`✅ Selected Wikidata song with synced lyrics: ${bestSynced.song.title}`);
      return {
        videoId: bestSynced.song.videoId,
        artist: bestSynced.song.artistName,
        track: bestSynced.song.title,
        year: bestSynced.song.year
      };
    }

    if (bestPlain) {
      console.log(`✅ Selected Wikidata song with plain lyrics: ${bestPlain.song.title}`);
      return {
        videoId: bestPlain.song.videoId,
        artist: bestPlain.song.artistName,
        track: bestPlain.song.title,
        year: bestPlain.song.year
      };
    }

    // Last resort: any Wikidata song even without lyrics
    if (anyWikidata) {
      console.log(`⚠️ Selected Wikidata song without lyrics: ${anyWikidata.song.title}`);
      return {
        videoId: anyWikidata.song.videoId,
        artist: anyWikidata.song.artistName,
        track: anyWikidata.song.title,
        year: anyWikidata.song.year
      };
    }

    console.error('❌ No song found for today');
    return null;
  }
}
