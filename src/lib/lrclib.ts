const BASE_URL_SEARCH = 'https://lrclib.net/api/search';

const SIMILARITY_THRESHOLD = 0.8;
const HIGH_SIMILARITY = 0.9;
const DECENT_SIMILARITY = 0.6;
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
}

// Function to calculate the
// Jaro Similarity of two strings
function jaro_distance(s1: string, s2: string) {
	// If the strings are equal
	if (s1 == s2) return 1.0;

	// Length of two strings
	const len1 = s1.length,
		len2 = s2.length;

	if (len1 == 0 || len2 == 0) return 0.0;

	// Maximum distance upto which matching
	// is allowed
	const max_dist = Math.floor(Math.max(len1, len2) / 2) - 1;

	// Count of matches
	let match = 0;

	// Hash for matches
	const hash_s1 = new Array(s1.length);
	hash_s1.fill(0);
	const hash_s2 = new Array(s2.length);
	hash_s2.fill(0);

	// Traverse through the first string
	for (let i = 0; i < len1; i++) {
		// Check if there is any matches
		for (let j = Math.max(0, i - max_dist); j < Math.min(len2, i + max_dist + 1); j++)
			// If there is a match
			if (s1[i] == s2[j] && hash_s2[j] == 0) {
				hash_s1[i] = 1;
				hash_s2[j] = 1;
				match++;
				break;
			}
	}

	// If there is no match
	if (match == 0) return 0.0;

	// Number of transpositions
	let t = 0;

	let point = 0;

	// Count number of occurrences
	// where two characters match but
	// there is a third matched character
	// in between the indices
	for (let i = 0; i < len1; i++)
		if (hash_s1[i] == 1) {
			// Find the next matched character
			// in second string
			while (hash_s2[point] == 0) point++;

			if (s1[i] != s2[point++]) t++;
		}
	t /= 2;

	// Return the Jaro Similarity
	return (match / len1 + match / len2 + (match - t) / match) / 3.0;
}

// Jaro Winkler Similarity
function jaroWinkler(s1: string, s2: string) {
	let jaro_dist = jaro_distance(s1, s2);

	// If the jaro Similarity is above a threshold
	if (jaro_dist > 0.7) {
		// Find the length of common prefix
		let prefix = 0;

		for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
			// If the characters match
			if (s1[i] == s2[i]) prefix++;
			// Else break
			else break;
		}

		// Maximum of 4 characters are allowed in prefix
		prefix = Math.min(4, prefix);

		// Calculate jaro winkler Similarity
		jaro_dist += 0.1 * prefix * (1 - jaro_dist);
	}
	return jaro_dist;
}

function findBestMatch(
	results: LRCLibResponse[],
	track: string,
	artist: string
): LRCLibResponse | undefined {
	let bestOverallMatch: LRCLibResponse | undefined;
	let highestOverallSimilarity = -1;

	let bestSyncedCandidate: LRCLibResponse | undefined;
	let highestSyncedSimilarity = -1;
	let highestPlainSimilarity = -1;

	for (const result of results) {
		const trackSimilarity = jaroWinkler(track.toLowerCase(), result.trackName.toLowerCase());

		if (trackSimilarity < DECENT_SIMILARITY) {
			continue;
		}

		let effectiveSimilarity: number;

		// If no artist is provided, base similarity only on track.
		if (!artist || artist.trim() === '') {
			effectiveSimilarity = trackSimilarity;
		} else {
			// Original logic for when an artist is provided.
			const artistSimilarity = jaroWinkler(artist.toLowerCase(), result.artistName.toLowerCase());
			const albumSimilarity = jaroWinkler(track.toLowerCase(), result.albumName.toLowerCase());

			effectiveSimilarity =
				trackSimilarity * TRACK_MULTIPLIER + artistSimilarity * ARTIST_MULTIPLIER;

			if (albumSimilarity > HIGH_SIMILARITY) {
				effectiveSimilarity += BONUS_SIMILARITY;
			}
		}

		effectiveSimilarity = Math.min(effectiveSimilarity, FULL_SIMILARITY);

		if (effectiveSimilarity >= SIMILARITY_THRESHOLD) {
			if (effectiveSimilarity > highestOverallSimilarity) {
				highestOverallSimilarity = effectiveSimilarity;
				bestOverallMatch = result;
			}

			if (result.syncedLyrics && effectiveSimilarity > highestSyncedSimilarity) {
				highestSyncedSimilarity = effectiveSimilarity;
				bestSyncedCandidate = result;
			} else if (result.plainLyrics && effectiveSimilarity > highestPlainSimilarity) {
				highestPlainSimilarity = effectiveSimilarity;
			}
		}
	}

	// Prioritize synced lyrics if a good synced match was found, otherwise return the best overall match.
	// If no synced match is found, it will fall back to the best plain match (which is also the best overall match if no synced lyrics were present).
	return bestSyncedCandidate || bestOverallMatch;
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

export async function getSyncedLyrics(
	track: string,
	artist: string,
	duration: number
): Promise<LyricsResult> {
	//Avoid Chinese, Japanese and Korean characters from tracks when searching for lyrics
	const sanitizedTrack = track
		.replace(
			/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf\uac00-\ud7af]/g,
			''
		)
		.trim();

	const url = `${BASE_URL_SEARCH}?q=${encodeURIComponent(
		artist + ' ' + sanitizedTrack
	)}&duration=${duration}`;
	console.log('URL:', url);

	try {
		const res = await fetch(url);

		if (res.status === 404) {
			return { lyrics: [], found: false, synced: false };
		}
		if (!res.ok) {
			throw new Error('Error fetching synced lyrics');
		}

		const data: LRCLibResponse[] = await res.json();
		const finalMatch = findBestMatch(data, sanitizedTrack, artist);

		if (finalMatch) {
			return parseLyrics(finalMatch);
		}
	} catch (error) {
		console.error('Error fetching or processing lyrics:', error);
	}

	return { lyrics: [], found: false, synced: false };
}
