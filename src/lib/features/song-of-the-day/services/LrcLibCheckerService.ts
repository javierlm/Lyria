import type { LyricsCheckResult } from '../domain/SongOfTheDay';

const BASE_URL_SEARCH = 'https://lrclib.net/api/search';
const SIMILARITY_THRESHOLD = 0.8;

interface LRCLibResponse {
  id: number;
  trackName: string;
  artistName: string;
  plainLyrics: string;
  syncedLyrics: string | null;
}

export class LrcLibCheckerService {
  /**
   * Check if a song has lyrics available in LRCLib
   * Returns the type of lyrics available: synced, plain, or none
   */
  async checkLyrics(artist: string, track: string): Promise<LyricsCheckResult> {
    try {
      const query = `${artist} ${track}`;
      const response = await fetch(`${BASE_URL_SEARCH}?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        return { hasLyrics: false, type: 'none' };
      }

      const data: LRCLibResponse[] = await response.json();

      if (!data || data.length === 0) {
        return { hasLyrics: false, type: 'none' };
      }

      // Find the best matching result
      const match = this.findBestMatch(data, artist, track);

      if (!match) {
        return { hasLyrics: false, type: 'none' };
      }

      // Check for synced lyrics first (priority)
      if (match.syncedLyrics && match.syncedLyrics.trim().length > 0) {
        return {
          hasLyrics: true,
          type: 'synced',
          lrclibId: match.id,
          trackName: match.trackName,
          artistName: match.artistName
        };
      }

      // Check for plain lyrics
      if (match.plainLyrics && match.plainLyrics.trim().length > 0) {
        return {
          hasLyrics: true,
          type: 'plain',
          lrclibId: match.id,
          trackName: match.trackName,
          artistName: match.artistName
        };
      }

      return { hasLyrics: false, type: 'none' };
    } catch (error) {
      console.error('LRCLib check error:', error);
      return { hasLyrics: false, type: 'none' };
    }
  }

  private findBestMatch(
    results: LRCLibResponse[],
    artist: string,
    track: string
  ): LRCLibResponse | null {
    const artistNorm = artist.toLowerCase().trim();
    const trackNorm = track.toLowerCase().trim();

    let bestMatch: LRCLibResponse | null = null;
    let bestScore = 0;

    for (const result of results) {
      const resultArtistNorm = result.artistName.toLowerCase().trim();
      const resultTrackNorm = result.trackName.toLowerCase().trim();

      // Check for exact matches first
      const artistExact = resultArtistNorm === artistNorm;
      const trackExact = resultTrackNorm === trackNorm;

      if (artistExact && trackExact) {
        return result; // Perfect match
      }

      // Calculate similarity scores
      const artistScore = this.calculateSimilarity(artistNorm, resultArtistNorm);
      const trackScore = this.calculateSimilarity(trackNorm, resultTrackNorm);
      const combinedScore = artistScore * 0.4 + trackScore * 0.6;

      if (combinedScore > bestScore && combinedScore >= SIMILARITY_THRESHOLD) {
        bestScore = combinedScore;
        bestMatch = result;
      }
    }

    return bestMatch;
  }

  private calculateSimilarity(s1: string, s2: string): number {
    // Simple Jaro-Winkler-like similarity
    if (s1 === s2) return 1;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    const matchingChars = this.countMatchingChars(longer, shorter);
    return matchingChars / longer.length;
  }

  private countMatchingChars(s1: string, s2: string): number {
    let matches = 0;
    const s2Arr = s2.split('');

    for (const char of s1) {
      const index = s2Arr.indexOf(char);
      if (index !== -1) {
        matches++;
        s2Arr.splice(index, 1);
      }
    }

    return matches;
  }
}
