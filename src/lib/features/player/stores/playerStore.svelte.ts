import type { SyncedLine, LRCLibResponse } from '$lib/features/player/services/lrclib';
import { getLanguage } from '$lib/features/settings/domain/language';

export const LyricsStates = {
  Idle: 'idle',
  Loading: 'loading',
  Found: 'found',
  NotFound: 'notFound'
} as const;

export type LyricsState = (typeof LyricsStates)[keyof typeof LyricsStates];

export interface PreferredSearchMetadata {
  videoId: string;
  artist: string;
  track: string;
  source: 'clicked' | 'persisted';
}

type OriginalSubtitlePreference = 'show' | 'hide' | null;

const DEFAULT_VOLUME = 100;
const VOLUME_STORAGE_KEY = 'lyria_volume';
const MUTED_STORAGE_KEY = 'lyria_muted';

function getStoredVolume(): number {
  if (globalThis.window === undefined) {
    return DEFAULT_VOLUME;
  }

  const storedVolume = Number.parseInt(localStorage.getItem(VOLUME_STORAGE_KEY) || '', 10);

  if (Number.isNaN(storedVolume)) {
    return DEFAULT_VOLUME;
  }

  return Math.max(0, Math.min(100, storedVolume));
}

function getStoredMuted(): boolean {
  if (globalThis.window === undefined) {
    return false;
  }

  return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
}

// This holds the reactive state of the player UI.
// Components will bind to this state to stay in sync.
export const playerState = $state({
  videoId: null as string | null,
  artist: '',
  track: '',
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  volume: getStoredVolume(),
  isMuted: getStoredMuted(),
  lines: [] as SyncedLine[],
  translatedLines: [] as SyncedLine[],
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
  originalSubtitlePreference: null as OriginalSubtitlePreference,
  autoHideOriginalSubtitle: false,
  showTranslatedSubtitle: true,
  detectedSourceLanguage: undefined as string | undefined,
  percentageOfDetectedLanguages: undefined as number | undefined,
  isLoadingVideo: false,
  manualLyricId: null as number | null,
  searchQuery: '',
  candidates: [] as LRCLibResponse[],
  isLyricSelectorOpen: false,
  isLyricVideo: false,
  videoError: null as { code: number; message: string } | null,
  parsedTitle: null as { artist: string; track: string } | null,
  preferredSearchMetadata: null as PreferredSearchMetadata | null,
  forceHorizontalMode: false,
  buffered: 0,
  // Transliteration state
  transliteratedLines: [] as SyncedLine[],
  showTransliteration: true,
  transliterationAvailable: false,
  transliterationLang: null as string | null
});

let playerInstance: YT.Player | null = null;

export function getPlayer(): YT.Player | null {
  return playerInstance;
}

export function setPlayer(player: YT.Player | null) {
  playerInstance = player;
}

function syncOriginalSubtitleVisibility() {
  if (playerState.originalSubtitlePreference === 'show') {
    playerState.showOriginalSubtitle = true;
    return;
  }

  if (playerState.originalSubtitlePreference === 'hide') {
    playerState.showOriginalSubtitle = false;
    return;
  }

  playerState.showOriginalSubtitle = !playerState.autoHideOriginalSubtitle;
}

function getOriginalSubtitlePreference(value: boolean | null): OriginalSubtitlePreference {
  if (value === null) {
    return null;
  }

  return value ? 'show' : 'hide';
}

export function setOriginalSubtitlePreference(value: boolean | null) {
  playerState.originalSubtitlePreference = getOriginalSubtitlePreference(value);
  syncOriginalSubtitleVisibility();
}

export function setOriginalSubtitleAutoHide(value: boolean) {
  playerState.autoHideOriginalSubtitle = value;
  syncOriginalSubtitleVisibility();
}
