import type { SyncedLine } from '$lib/lrclib';
import { getLanguage } from '$lib/language';

// This holds the reactive state of the player UI.
// Components will bind to this state to stay in sync.
export const playerState = $state({
	videoId: null as string | null,
	artist: '',
	track: '',
	isPlaying: false,
	duration: 0,
	currentTime: 0,
	volume: 100,
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
	userLang: getLanguage(), // Initialize userLang using getLanguage()
	id: 0
});

let playerInstance: YT.Player | null = null;

export function getPlayer(): YT.Player | null {
	return playerInstance;
}

export function setPlayer(player: YT.Player | null) {
	playerInstance = player;
}
