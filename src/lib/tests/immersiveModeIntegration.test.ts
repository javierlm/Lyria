import { describe, it, expect, beforeEach } from 'vitest';
import { playerState } from '$lib/features/player/stores/playerStore.svelte';
import { toggleImmersiveMode, resetPlayerState } from '$lib/features/player/services/playerActions';
import {
  getInitialTargetLineIndex,
  getUpcomingVisibleLineIndex,
  hasVisibleText,
  findNextVisibleLineIndex,
  type ScrollLine
} from '$lib/features/player/services/lyricsScrollRecovery';

describe('Immersive Mode Integration', () => {
  beforeEach(() => {
    playerState.isImmersiveMode = false;
    playerState.videoId = null;
    playerState.lines = [];
    playerState.currentLineIndex = -1;
    playerState.currentTime = 0;
    playerState.timingOffset = 0;
    playerState.lyricsAreSynced = false;
  });

  describe('toggleImmersiveMode', () => {
    it('toggles isImmersiveMode from false to true', () => {
      expect(playerState.isImmersiveMode).toBe(false);
      toggleImmersiveMode();
      expect(playerState.isImmersiveMode).toBe(true);
    });

    it('toggles isImmersiveMode from true to false', () => {
      playerState.isImmersiveMode = true;
      toggleImmersiveMode();
      expect(playerState.isImmersiveMode).toBe(false);
    });
  });

  describe('resetPlayerState clears immersive mode', () => {
    it('resets isImmersiveMode to false', () => {
      playerState.isImmersiveMode = true;
      resetPlayerState();
      expect(playerState.isImmersiveMode).toBe(false);
    });
  });

  describe('lyricsScrollRecovery shared helpers', () => {
    const lines: ScrollLine[] = [
      { text: '', startTimeMs: 0 },
      { text: 'Line 1', startTimeMs: 1000 },
      { text: '   ', startTimeMs: 2000 },
      { text: 'Line 2', startTimeMs: 3000 }
    ];

    it('hasVisibleText returns correct results', () => {
      expect(hasVisibleText(lines, 0)).toBe(false);
      expect(hasVisibleText(lines, 1)).toBe(true);
      expect(hasVisibleText(lines, 2)).toBe(false);
      expect(hasVisibleText(lines, 3)).toBe(true);
    });

    it('findNextVisibleLineIndex skips empty lines', () => {
      expect(findNextVisibleLineIndex(lines, 0)).toBe(1);
      expect(findNextVisibleLineIndex(lines, 2)).toBe(3);
      expect(findNextVisibleLineIndex(lines, 4)).toBe(-1);
    });

    it('getUpcomingVisibleLineIndex returns next visible for synced', () => {
      const result = getUpcomingVisibleLineIndex({
        lines,
        currentLineIndex: 1,
        currentTimeSeconds: 0,
        timingOffsetMs: 0,
        lyricsAreSynced: true
      });
      expect(result).toBe(3);
    });

    it('getUpcomingVisibleLineIndex returns -1 when not synced', () => {
      const result = getUpcomingVisibleLineIndex({
        lines,
        currentLineIndex: -1,
        currentTimeSeconds: 0,
        timingOffsetMs: 0,
        lyricsAreSynced: false
      });
      expect(result).toBe(-1);
    });

    it('getInitialTargetLineIndex prefers active line', () => {
      const result = getInitialTargetLineIndex({
        lines,
        currentLineIndex: 1,
        currentTimeSeconds: 0,
        timingOffsetMs: 0,
        lyricsAreSynced: true
      });
      expect(result).toBe(1);
    });

    it('getInitialTargetLineIndex falls back to upcoming when no active', () => {
      const result = getInitialTargetLineIndex({
        lines,
        currentLineIndex: -1,
        currentTimeSeconds: 1.1,
        timingOffsetMs: 0,
        lyricsAreSynced: true
      });
      expect(result).toBe(3);
    });

    it('getInitialTargetLineIndex falls back to first visible when no upcoming', () => {
      const result = getInitialTargetLineIndex({
        lines,
        currentLineIndex: -1,
        currentTimeSeconds: 999,
        timingOffsetMs: 0,
        lyricsAreSynced: true
      });
      expect(result).toBe(1);
    });
  });
});
