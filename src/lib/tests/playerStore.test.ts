import { beforeEach, describe, expect, it } from 'vitest';

import {
  playerState,
  setOriginalSubtitleAutoHide,
  setOriginalSubtitlePreference
} from '$lib/features/player/stores/playerStore.svelte';

describe('playerStore original subtitle visibility', () => {
  beforeEach(() => {
    setOriginalSubtitlePreference(null);
    setOriginalSubtitleAutoHide(false);
  });

  it('hides original subtitles automatically for lyric videos by default', () => {
    setOriginalSubtitleAutoHide(true);

    expect(playerState.showOriginalSubtitle).toBe(false);
  });

  it('restores original subtitles when automatic hiding is cleared', () => {
    setOriginalSubtitleAutoHide(true);
    setOriginalSubtitleAutoHide(false);

    expect(playerState.showOriginalSubtitle).toBe(true);
  });

  it('preserves manual hiding when switching away from a lyric video', () => {
    setOriginalSubtitlePreference(false);
    setOriginalSubtitleAutoHide(true);
    setOriginalSubtitleAutoHide(false);

    expect(playerState.showOriginalSubtitle).toBe(false);
  });

  it('lets manual showing override automatic hiding', () => {
    setOriginalSubtitleAutoHide(true);
    setOriginalSubtitlePreference(true);

    expect(playerState.showOriginalSubtitle).toBe(true);
  });
});
