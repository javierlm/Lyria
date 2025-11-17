const junkSuffixes = [
	'official music video',
	'official video',
	'lyric video',
	'audio',
	'hd',
	'4k',
	'live',
	'visualizer',
	'visual',
	'clip',
	'teaser',
	'trailer',
	'remix',
	'cover',
	'acoustic',
	'instrumental',
	'karaoke',
	'version',
	'edit',
	'extended',
	'radio edit',
	'album version',
	'full album',
	'ep',
	'single',
	'from the album',
	'from the movie',
	'soundtrack',
	'theme',
	'ost',
	'original soundtrack',
	'original mix',
	'official audio',
	'official lyric video',
	'official visualizer',
	'official visual',
	'official clip',
	'official teaser',
	'official trailer',
	'official remix',
	'official cover',
	'official acoustic',
	'official instrumental',
	'official karaoke',
	'official version',
	'official edit',
	'official extended',
	'official radio edit',
	'official album version',
	'official full album',
	'official ep',
	'official single',
	'official from the album',
	'official from the movie',
	'official soundtrack',
	'official theme',
	'official ost',
	'official original soundtrack',
	'official original mix'
];

const junkRegex = new RegExp(`\\s*[-–—|]?\\s*(?:${junkSuffixes.join('|')})\\s*$`, 'gi');

type ParseState = {
	title: string;
	artist: string;
	track: string;
	featured: string;
};

type PipelineStep = (state: ParseState) => ParseState;

// Normalize handles of social networks and camelCase
const normalizeHandles: PipelineStep = (state) => {
	const normalized = state.title
		// Remove @
		.replace(/@([a-zA-Z0-9_]+)/g, '$1')
		// Separate camelCase and PascalCase
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		// Separate numbers of letters
		.replace(/([a-zA-Z])(\d)/g, '$1 $2')
		.replace(/(\d)([a-zA-Z])/g, '$1 $2');

	return { ...state, title: normalized };
};

//Extracts featured artists from parenthesis, square brackets with "ft" or "feat"
const extractFeaturedFromBrackets: PipelineStep = (state) => {
	const featured: string[] = state.featured ? [state.featured] : [];

	const title = state.title.replace(
		/\s*[([](?:\bft\b|\bfeat\b)\.?\s*(.*?)[)\]]/gi,
		(_, artists) => {
			if (artists) featured.push(artists.trim());
			return '';
		}
	);

	return { ...state, title, featured: featured.join(' ') };
};

// Clean remaining parenthesis and square brackets
const removeBrackets: PipelineStep = (state) => ({
	...state,
	title: state.title.replace(/\s*[([].*?[)\]]/g, '')
});

// Auxiliar function to clean junk suffixes from titles
export function removeJunkSuffixes(title: string): string {
	return title.replace(junkRegex, '').trim();
}

// Pipeline step which calls the auxiliar function for removing junk suffixes
const removeJunkSuffixesStep: PipelineStep = (state) => ({
	...state,
	title: removeJunkSuffixes(state.title)
});

// Tries to find first separator and divide the title between artist and song
const splitArtistAndTrack: PipelineStep = (state) => {
	const separators = [' - ', ' – ', ' | ', ' x '];

	for (const sep of separators) {
		const idx = state.title.indexOf(sep);
		if (idx !== -1) {
			return {
				...state,
				artist: state.title.substring(0, idx).trim(),
				track: state.title.substring(idx + sep.length).trim()
			};
		}
	}

	return { ...state, track: state.title.trim() };
};

// Extracts ft/feat from text and returns the text clean and the artists
const extractFeatFromText = (text: string): { clean: string; feat: string } => {
	const match = text.match(/\s*(?:\bft\b|\bfeat\b)\.?\s*(.*)$/i);
	if (match?.[1]) {
		return {
			clean: text.substring(0, match.index).trim(),
			feat: match[1].trim()
		};
	}
	return { clean: text, feat: '' };
};

// Extracts ft/feat from artist and song
const extractFeaturedFromParts: PipelineStep = (state) => {
	const artistResult = extractFeatFromText(state.artist);
	const trackResult = extractFeatFromText(state.track);

	const allFeatured = [state.featured, artistResult.feat, trackResult.feat]
		.filter(Boolean)
		.join(' ');

	return {
		...state,
		artist: artistResult.clean,
		track: trackResult.clean,
		featured: allFeatured
	};
};

// Join featured artists in the artist field
const mergeFeaturedIntoArtist: PipelineStep = (state) => {
	if (!state.featured) return state;

	const cleanFeatured = state.featured.replace(/&/g, '').replace(/\s+/g, ' ').trim();
	const artist = state.artist ? `${state.artist} ${cleanFeatured}` : cleanFeatured;

	return { ...state, artist };
};

// Remove common punctuation marks
const removePunctuation: PipelineStep = (state) => {
	const newState = {
		...state,
		artist: state.artist
			.replace(/-/g, ' ')
			.replace(/[!"#$%&'()*+,./:;<=>?@[\\]^_`{|}~""''«»—–—´`¨;:！]/g, '')
			.trim(),
		track: state.track
			.replace(/-/g, ' ')
			.replace(/[!"#$%&'()*+,./:;<=>?@[\\]^_`{|}~""''«»—–—´`¨;:！]/g, '')
			.trim()
	};
	return newState;
};

// Final cleanup of whitespaces, symbols and final separators
const finalCleanup: PipelineStep = (state) => ({
	...state,
	artist: state.artist.replace(/\s+/g, ' ').trim(),
	track: state.track.replace(/\s+/g, ' ').replace(/-\s*$/, '').split('|')[0].trim()
});

// Pipeline of transformations
const pipeline: PipelineStep[] = [
	normalizeHandles,
	extractFeaturedFromBrackets,
	removeBrackets,
	removeJunkSuffixesStep,
	splitArtistAndTrack,
	extractFeaturedFromParts,
	mergeFeaturedIntoArtist,
	removePunctuation,
	finalCleanup
];

export function parseTitle(title: string): { artist: string; track: string } {
	const initialState: ParseState = { title, artist: '', track: '', featured: '' };

	const result = pipeline.reduce((state, step) => step(state), initialState);

	return { artist: result.artist, track: result.track };
}

export function extractVideoId(url: string): string | null {
	const match = url.match(
		/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/\S*?|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
	);
	return match ? match[1] : null;
}

export function debounce<T extends (...args: unknown[]) => void>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout>;

	return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), delay);
	};
}
