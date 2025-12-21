import type { SyncedLine, LRCLibResponse } from '$lib/features/player/services/lrclib';
import { getLanguage } from '$lib/features/settings/domain/language';

export const LyricsStates = {
	Idle: 'idle',
	Loading: 'loading',
	Found: 'found',
	NotFound: 'notFound'
} as const;

export type LyricsState = (typeof LyricsStates)[keyof typeof LyricsStates];

// This holds the reactive state of the player UI.
// Components will bind to this state to stay in sync.
export const playerState = $state({
	videoId: null as string | null,
	artist: '',
	track: '',
	isPlaying: false,
	duration: 0,
	currentTime: 0,
	volume:
		typeof window !== 'undefined'
			? parseInt(localStorage.getItem('lyria_volume') || '100', 10)
			: 100,
	isMuted: false,
	lines: [] as SyncedLine[],
	translatedLines: [] as SyncedLine[],
	currentLine: '',
	currentTranslatedLine: '',
	currentLineIndex: -1,
	isFullscreen: false,
	timingOffset: 0,
	isTranslatedTextReady: false,
	lyricsAreSynced: false,
	lyricsState: LyricsStates.Idle as LyricsState,
	userLang: getLanguage(), // Initialize userLang using getLanguage()
	id: 0,
	isSeeking: false,
	showOriginalSubtitle: true,
	showTranslatedSubtitle: true,
	detectedSourceLanguage: undefined as string | undefined,
	percentageOfDetectedLanguages: undefined as number | undefined,
	isLoadingVideo: false,
	manualLyricId: null as number | null,
	candidates: [] as LRCLibResponse[],
	isLyricSelectorOpen: false,
	isLyricVideo: false
});

let playerInstance: YT.Player | null = null;

export function getPlayer(): YT.Player | null {
	return playerInstance;
}

export function setPlayer(player: YT.Player | null) {
	playerInstance = player;
}
