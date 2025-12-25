const BASE_URL_SEARCH = 'https://lrclib.net/api/search';

const SIMILARITY_THRESHOLD = 0.8;
const HIGH_SIMILARITY = 0.9;
const BONUS_SIMILARITY = 0.1;
const FULL_SIMILARITY = 1.0;

const TRACK_MULTIPLIER = 0.6;
const ARTIST_MULTIPLIER = 0.4;

export interface SyncedLine {
  startTimeMs: number;
  text: string;
}

export interface LRCLibResponse {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string | null;
}

export interface LyricsResult {
  lyrics: SyncedLine[];
  plainLyrics?: string;
  found: boolean;
  synced: boolean;
  id?: number;
  artistName?: string;
  trackName?: string;
  candidates?: LRCLibResponse[];
}

// Jaro-Winkler implementation
function jaro_distance(s1: string, s2: string) {
  if (s1 == s2) return FULL_SIMILARITY;

  const len1 = s1.length,
    len2 = s2.length;

  if (len1 == 0 || len2 == 0) return 0.0;

  const max_dist = Math.floor(Math.max(len1, len2) / 2) - 1;
  let match = 0;

  const hash_s1 = new Array(s1.length);
  hash_s1.fill(0);
  const hash_s2 = new Array(s2.length);
  hash_s2.fill(0);

  for (let i = 0; i < len1; i++) {
    for (let j = Math.max(0, i - max_dist); j < Math.min(len2, i + max_dist + 1); j++)
      if (s1[i] == s2[j] && hash_s2[j] == 0) {
        hash_s1[i] = 1;
        hash_s2[j] = 1;
        match++;
        break;
      }
  }

  if (match == 0) return 0.0;

  let t = 0;
  let point = 0;

  for (let i = 0; i < len1; i++)
    if (hash_s1[i] == 1) {
      while (hash_s2[point] == 0) point++;
      if (s1[i] != s2[point++]) t++;
    }
  t /= 2;

  return (match / len1 + match / len2 + (match - t) / match) / 3.0;
}

function jaroWinkler(s1: string, s2: string) {
  let jaro_dist = jaro_distance(s1, s2);

  if (jaro_dist > 0.7) {
    let prefix = 0;

    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] == s2[i]) prefix++;
      else break;
    }

    prefix = Math.min(4, prefix);
    jaro_dist += 0.1 * prefix * (1 - jaro_dist);
  }
  return jaro_dist;
}

// Calculate similarity considering common variations
function fuzzyMatch(search: string, target: string): number {
  const searchNorm = search.toLowerCase().replace(/\s+/g, '');
  const targetNorm = target.toLowerCase().replace(/\s+/g, '');

  // If identical without spaces, it's a perfect match
  if (searchNorm === targetNorm) return FULL_SIMILARITY;

  // Use Jaro-Winkler with both versions and take the best
  const withSpaces = jaroWinkler(search.toLowerCase(), target.toLowerCase());
  const withoutSpaces = jaroWinkler(searchNorm, targetNorm);

  return Math.min(Math.max(withSpaces, withoutSpaces), FULL_SIMILARITY);
}

// Scenario 1: Standard match (artist and track properly separated)
function calculateStandardMatch(
  trackLower: string,
  artistLower: string,
  result: LRCLibResponse
): number {
  if (!artistLower || !trackLower) return 0;

  const trackSim = fuzzyMatch(trackLower, result.trackName.toLowerCase());
  const artistSim = fuzzyMatch(artistLower, result.artistName.toLowerCase());
  let score = trackSim * TRACK_MULTIPLIER + artistSim * ARTIST_MULTIPLIER;

  // Bonus if album matches the track (only if we haven't exceeded HIGH_SIMILARITY)
  if (score < HIGH_SIMILARITY) {
    const albumSim = fuzzyMatch(trackLower, result.albumName.toLowerCase());
    if (albumSim > HIGH_SIMILARITY) {
      score = Math.min(score + BONUS_SIMILARITY, FULL_SIMILARITY);
    }
  }

  return Math.min(score, FULL_SIMILARITY);
}

// Scenario 2: Inverted match (track and artist fields swapped)
function calculateInvertedMatch(
  trackLower: string,
  artistLower: string,
  result: LRCLibResponse
): number {
  if (!artistLower || !trackLower) return 0;

  const trackSim = fuzzyMatch(trackLower, result.artistName.toLowerCase());
  const artistSim = fuzzyMatch(artistLower, result.trackName.toLowerCase());
  const score = (trackSim * TRACK_MULTIPLIER + artistSim * ARTIST_MULTIPLIER) * 0.95;

  return Math.min(score, FULL_SIMILARITY);
}

// Scenario 3: Single field match (all text in one field, no artist)
function calculateSingleFieldMatch(trackLower: string, result: LRCLibResponse): number {
  const resultTrackLower = result.trackName.toLowerCase();
  const resultArtistLower = result.artistName.toLowerCase();

  const directTrackSim = fuzzyMatch(trackLower, resultTrackLower);
  const directArtistSim = fuzzyMatch(trackLower, resultArtistLower);

  // Look for partial substring matches
  const trackWords = trackLower.split(/\s+/).filter((w) => w.length > 3);
  const containsTrack =
    trackWords.some((word) => resultTrackLower.includes(word)) ||
    resultTrackLower.split(/\s+/).some((word) => word.length > 3 && trackLower.includes(word));
  const containsArtist =
    trackWords.some((word) => resultArtistLower.includes(word)) ||
    resultArtistLower.split(/\s+/).some((word) => word.length > 3 && trackLower.includes(word));

  let score = Math.max(directTrackSim, directArtistSim * 0.8);

  // Apply bonus for partial matches
  if (containsTrack && containsArtist) {
    score = Math.min(score + BONUS_SIMILARITY * 2, FULL_SIMILARITY);
  } else if (containsTrack || containsArtist) {
    score = Math.min(score + BONUS_SIMILARITY, FULL_SIMILARITY);
  }

  return Math.min(score, FULL_SIMILARITY);
}

// Scenario 4: Word-based combined search
function calculateWordBasedMatch(
  trackLower: string,
  artistLower: string,
  result: LRCLibResponse
): number {
  const combinedSearch = (trackLower + ' ' + artistLower).trim();
  if (!combinedSearch) return 0;

  const resultTrackLower = result.trackName.toLowerCase();
  const resultArtistLower = result.artistName.toLowerCase();

  const words = combinedSearch.split(/\s+/).filter((w) => w.length > 3);
  const trackWords = resultTrackLower.split(/\s+/).filter((w) => w.length > 3);
  const artistWords = resultArtistLower.split(/\s+/).filter((w) => w.length > 3);

  let matchCount = 0;
  const totalWords = Math.max(words.length, trackWords.length + artistWords.length);

  for (const word of words) {
    if (
      trackWords.some((tw) => fuzzyMatch(word, tw) > 0.85) ||
      artistWords.some((aw) => fuzzyMatch(word, aw) > 0.85)
    ) {
      matchCount++;
    }
  }

  const score = totalWords > 0 ? (matchCount / totalWords) * 0.9 : 0;
  return Math.min(score, FULL_SIMILARITY);
}

function calculateDurationScore(targetDuration: number, resultDuration: number): number {
  if (!targetDuration || targetDuration <= 0) return 1.0;

  const diff = targetDuration - resultDuration;
  const absDiff = Math.abs(diff);

  // Case 0: Perfect match (or very close)
  // If the difference is very small (e.g. < 5 seconds), give a big bonus
  if (absDiff < 5) return 1.15;

  // Case 1: Video is longer than lyrics (diff >= 0)
  // This is common (intros, outros, credits).
  if (diff >= 0) {
    // Tier 2: Close match (within 60s)
    // Give a moderate bonus to prefer this over a "safe but far" match
    if (diff <= 60) return 1.1;

    // Tier 3: Safe match (within 3 minutes)
    if (diff <= 180) return 1.0;

    // Tier 4: Long match
    // If it's more than 3 minutes longer, start penalizing slowly
    const extraDiff = diff - 180;
    const tolerance = 180; // Slow decay
    return 1 / (1 + Math.pow(extraDiff / tolerance, 2));
  }

  // Case 2: Video is shorter than lyrics (diff < 0)
  // This usually means the video is a cut version or wrong match. Be strict.
  // We allow a small margin (e.g. 10s) for metadata inconsistencies.
  const tolerance = 15; // Strict decay
  return 1 / (1 + Math.pow(absDiff / tolerance, 2));
}

// Calculate the best score considering multiple scenarios
function calculateFlexibleScore(
  searchTrack: string,
  searchArtist: string,
  result: LRCLibResponse
): number {
  const trackLower = searchTrack.toLowerCase();
  const artistLower = searchArtist.toLowerCase();

  const scores: number[] = [];

  // Evaluar todos los escenarios aplicables
  const standardScore = calculateStandardMatch(trackLower, artistLower, result);
  if (standardScore > 0) scores.push(standardScore);

  const invertedScore = calculateInvertedMatch(trackLower, artistLower, result);
  if (invertedScore > 0) scores.push(invertedScore);

  // Only evaluate single field if there's no artist
  if (!artistLower || artistLower.trim() === '') {
    const singleFieldScore = calculateSingleFieldMatch(trackLower, result);
    scores.push(singleFieldScore);
  }

  const wordBasedScore = calculateWordBasedMatch(trackLower, artistLower, result);
  if (wordBasedScore > 0) scores.push(wordBasedScore);

  return scores.length > 0 ? Math.min(Math.max(...scores), FULL_SIMILARITY) : 0;
}

/* Get the true duration of the video from the synced lyrics 
	Sometimes lyric's API duration attribute is not correct, so we need to get the last timestamp
	for a more accurate duration
*/
function getTrueDuration(result: LRCLibResponse): number {
  if (!result.syncedLyrics) return result.duration;

  const lastBracketIndex = result.syncedLyrics.lastIndexOf('[');
  if (lastBracketIndex === -1) return result.duration;

  const potentialTimestamp = result.syncedLyrics.substring(lastBracketIndex);
  const match = potentialTimestamp.match(/^\[(\d+):(\d+(\.\d+)?)\]/);

  if (match) {
    const minutes = parseInt(match[1]);
    const seconds = parseFloat(match[2]);
    const maxTime = minutes * 60 + seconds;

    // Only use maxTime if it's significantly larger than duration (e.g. > 10s difference)
    if (maxTime > result.duration + 10) {
      return maxTime;
    }
  }

  return result.duration;
}

function findBestMatch(
  results: LRCLibResponse[],
  track: string,
  artist: string,
  targetDuration: number
): LRCLibResponse | undefined {
  let bestOverallMatch: LRCLibResponse | undefined;
  let highestOverallSimilarity = -1;

  let bestSyncedCandidate: LRCLibResponse | undefined;
  let highestSyncedSimilarity = -1;

  // Determinar threshold dinámico basado en la calidad de los datos de entrada
  const hasArtist = artist && artist.trim() !== '';
  const baseThreshold = hasArtist ? SIMILARITY_THRESHOLD : SIMILARITY_THRESHOLD * 0.5;

  console.log('🔍 Searching for match:', { track, artist: artist || '(empty)' });
  console.log('📊 Threshold:', baseThreshold);

  for (const result of results) {
    const textSimilarity = calculateFlexibleScore(track, artist, result);
    const trueDuration = getTrueDuration(result);
    const durationScore = calculateDurationScore(targetDuration, trueDuration);

    // Combined score
    const effectiveSimilarity = textSimilarity * durationScore;

    console.log(
      `  - ${result.artistName} - ${result.trackName}: ${effectiveSimilarity.toFixed(3)} (Text: ${textSimilarity.toFixed(3)}, Dur: ${durationScore.toFixed(3)}) - ID: ${result.id}`
    );

    if (effectiveSimilarity >= baseThreshold) {
      if (effectiveSimilarity > highestOverallSimilarity) {
        highestOverallSimilarity = effectiveSimilarity;
        bestOverallMatch = result;
      }

      if (result.syncedLyrics && effectiveSimilarity > highestSyncedSimilarity) {
        highestSyncedSimilarity = effectiveSimilarity;
        bestSyncedCandidate = result;
      }
    }
  }

  const finalMatch = bestSyncedCandidate || bestOverallMatch;
  if (finalMatch) {
    console.log(
      '✅ Match found:',
      finalMatch.artistName,
      '-',
      finalMatch.trackName,
      `(${highestOverallSimilarity.toFixed(3)}) - ID: ${finalMatch.id}`
    );
  } else {
    console.log('❌ No suitable match found');
  }

  return finalMatch;
}

function parseLyrics(match: LRCLibResponse): LyricsResult {
  if (match.syncedLyrics) {
    const lyrics = match.syncedLyrics
      .split('\n')
      .map((line: string) => {
        const lineMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (!lineMatch) return null;
        const [, min, sec, ms, text] = lineMatch;
        const startTimeMs = +min * 60000 + +sec * 1000 + (ms.length === 2 ? +ms * 10 : +ms);
        return { startTimeMs, text: text.trim() };
      })
      .filter((line): line is SyncedLine => line !== null);

    return {
      lyrics,
      plainLyrics: match.plainLyrics,
      found: true,
      synced: true,
      id: match.id,
      artistName: match.artistName,
      trackName: match.trackName
    };
  }

  const plainLyricsLines = match.plainLyrics!.split('\n').map((line: string) => ({
    startTimeMs: 0,
    text: line
  }));

  return {
    lyrics: plainLyricsLines,
    plainLyrics: match.plainLyrics,
    found: true,
    synced: false,
    id: match.id,
    artistName: match.artistName,
    trackName: match.trackName
  };
}

// Normalize names for better matching
function normalizeForSearch(text: string): string {
  return (
    text
      // Remove @
      .replace(/@/g, '')
      // Separate camelCase and PascalCase
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Separate numbers of letters
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      .replace(/(\d)([a-zA-Z])/g, '$1 $2')
      // Normalize multiple spaces to only one
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export async function getSyncedLyrics(
  track: string,
  artist: string,
  duration: number
): Promise<LyricsResult> {
  const japaneseCharRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/gu;
  const punctuationRegex = /\p{P}/gu;

  const normalizedTrack = normalizeForSearch(track);
  const normalizedArtist = normalizeForSearch(artist);

  const sanitizedTrack = normalizedTrack
    .replace(japaneseCharRegex, '')
    .replace(punctuationRegex, '')
    .trim();
  const sanitizedArtist = normalizedArtist
    .replace(japaneseCharRegex, '')
    .replace(punctuationRegex, '')
    .trim();

  const query = sanitizedArtist ? `${sanitizedArtist} ${sanitizedTrack}` : sanitizedTrack;
  const url = `${BASE_URL_SEARCH}?q=${encodeURIComponent(query)}&duration=${duration}`;
  console.log('🌐 URL:', url);
  console.log('🔧 Normalized:', { track: sanitizedTrack, artist: sanitizedArtist });

  try {
    const res = await fetch(url);

    if (res.status === 404) {
      return { lyrics: [], found: false, synced: false };
    }
    if (!res.ok) {
      throw new Error('Error fetching synced lyrics');
    }

    const data: LRCLibResponse[] = await res.json();
    console.log(`📦 Results received: ${data.length}`);

    const finalMatch = findBestMatch(data, sanitizedTrack, sanitizedArtist, duration);

    if (finalMatch) {
      const result = parseLyrics(finalMatch);
      result.candidates = data;
      return result;
    }

    return { lyrics: [], found: false, synced: false, candidates: data };
  } catch (error) {
    console.error('❌ Error fetching or processing lyrics:', error);
  }

  return { lyrics: [], found: false, synced: false };
}

export async function searchCandidates(
  track: string,
  artist: string,
  duration: number
): Promise<LRCLibResponse[]> {
  const japaneseCharRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/gu;
  const punctuationRegex = /\p{P}/gu;

  const normalizedTrack = normalizeForSearch(track);
  const normalizedArtist = normalizeForSearch(artist);

  const sanitizedTrack = normalizedTrack
    .replace(japaneseCharRegex, '')
    .replace(punctuationRegex, '')
    .trim();
  const sanitizedArtist = normalizedArtist
    .replace(japaneseCharRegex, '')
    .replace(punctuationRegex, '')
    .trim();

  const query = sanitizedArtist ? `${sanitizedArtist} ${sanitizedTrack}` : sanitizedTrack;
  const url = `${BASE_URL_SEARCH}?q=${encodeURIComponent(query)}&duration=${duration}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const data: LRCLibResponse[] = await res.json();
    return data;
  } catch (error) {
    console.error('Error searching candidates:', error);
    return [];
  }
}

export async function getLyricById(id: number): Promise<LyricsResult> {
  const url = `https://lrclib.net/api/get/${id}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch lyric by ID');

    const data: LRCLibResponse = await res.json();
    return parseLyrics(data);
  } catch (error) {
    console.error('Error fetching lyric by ID:', error);
    return { lyrics: [], found: false, synced: false };
  }
}
