export { SongOfTheDayService } from './services/SongOfTheDayService';
export { default as SongOfTheDayCard } from './components/SongOfTheDayCard.svelte';
export { songOfTheDayStore } from './stores/songOfTheDayStore.svelte';

// Re-export types
export type {
  SongOfTheDayStored,
  SongOfTheDayDisplay,
  WikidataSong,
  LyricsCheckResult,
  FallbackSong
} from './domain/SongOfTheDay';
