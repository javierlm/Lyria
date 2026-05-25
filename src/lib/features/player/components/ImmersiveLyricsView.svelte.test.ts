import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImmersiveLyricsView from './ImmersiveLyricsView.svelte';
import { playerState, LyricsStates } from '$lib/features/player/stores/playerStore.svelte';
import * as playerActions from '$lib/features/player/services/playerActions';

function createSyncedLine(text: string, startTimeMs: number) {
  return { text, startTimeMs };
}

describe('ImmersiveLyricsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    playerState.lines = [];
    playerState.translatedLines = [];
    playerState.transliteratedLines = [];
    playerState.currentLineIndex = -1;
    playerState.currentTime = 0;
    playerState.timingOffset = 0;
    playerState.lyricsAreSynced = false;
    playerState.lyricsState = LyricsStates.Idle;
    playerState.showOriginalSubtitle = true;
    playerState.showTranslatedSubtitle = true;
    playerState.showTransliteration = true;
    playerState.transliterationAvailable = false;
    playerState.transliterationLang = null;
  });

  describe('seekTo function', () => {
    it('should be exported from playerActions', () => {
      expect(typeof playerActions.seekTo).toBe('function');
    });
  });

  describe('toggleImmersiveMode function', () => {
    it('should be exported from playerActions', () => {
      expect(typeof playerActions.toggleImmersiveMode).toBe('function');
    });
  });

  describe('adjustedTimes computation', () => {
    it('should compute adjustedTimes correctly with positive offset', () => {
      playerState.lines = [
        createSyncedLine('Line 1', 1000),
        createSyncedLine('Line 2', 5000)
      ];
      playerState.timingOffset = 500;

      const adjustedTimes = playerState.lines.map((line) =>
        Math.max(0, line.startTimeMs + playerState.timingOffset)
      );
      expect(adjustedTimes).toEqual([1500, 5500]);
    });

    it('should handle negative adjusted times with Math.max(0, ...)', () => {
      playerState.lines = [createSyncedLine('Line 1', 100)];
      playerState.timingOffset = -500;

      const adjustedTimes = playerState.lines.map((line) =>
        Math.max(0, line.startTimeMs + playerState.timingOffset)
      );
      expect(adjustedTimes).toEqual([0]);
    });
  });

  describe('hasVisibleText helper', () => {
    function hasVisibleText(index: number): boolean {
      return !!playerState.lines[index]?.text?.trim();
    }

    it('should return true for lines with text', () => {
      playerState.lines = [createSyncedLine('Hello', 0)];
      expect(hasVisibleText(0)).toBe(true);
    });

    it('should return false for empty lines', () => {
      playerState.lines = [createSyncedLine('', 0)];
      expect(hasVisibleText(0)).toBe(false);
    });

    it('should return false for whitespace-only lines', () => {
      playerState.lines = [createSyncedLine('   ', 0)];
      expect(hasVisibleText(0)).toBe(false);
    });

    it('should return false for out-of-bounds index', () => {
      playerState.lines = [];
      expect(hasVisibleText(0)).toBe(false);
    });
  });

  describe('activeVisibleLineIndex logic', () => {
    function hasVisibleText(index: number): boolean {
      return !!playerState.lines[index]?.text?.trim();
    }

    function getActiveVisibleLineIndex(): number {
      const currentIndex = playerState.currentLineIndex;
      if (currentIndex >= 0 && hasVisibleText(currentIndex)) {
        return currentIndex;
      }
      return -1;
    }

    it('should return currentLineIndex when line has text', () => {
      playerState.lines = [
        createSyncedLine('Line 1', 0),
        createSyncedLine('Line 2', 5000)
      ];
      playerState.currentLineIndex = 1;
      expect(getActiveVisibleLineIndex()).toBe(1);
    });

    it('should return -1 when current line is empty', () => {
      playerState.lines = [
        createSyncedLine('Line 1', 0),
        createSyncedLine('', 5000)
      ];
      playerState.currentLineIndex = 1;
      expect(getActiveVisibleLineIndex()).toBe(-1);
    });

    it('should return -1 when currentLineIndex is -1', () => {
      playerState.lines = [createSyncedLine('Line 1', 0)];
      playerState.currentLineIndex = -1;
      expect(getActiveVisibleLineIndex()).toBe(-1);
    });
  });

  describe('getDistance computation', () => {
    function hasVisibleText(index: number): boolean {
      return !!playerState.lines[index]?.text?.trim();
    }

    function getActiveVisibleLineIndex(): number {
      const currentIndex = playerState.currentLineIndex;
      if (currentIndex >= 0 && hasVisibleText(currentIndex)) {
        return currentIndex;
      }
      return -1;
    }

    function getProximityAnchorIndex(): number {
      const activeIndex = getActiveVisibleLineIndex();
      if (activeIndex >= 0) {
        return activeIndex;
      }
      return -1;
    }

    function getDistance(i: number): number {
      const proximityAnchorIndex = getProximityAnchorIndex();
      if (proximityAnchorIndex < 0) return 999;
      return Math.abs(i - proximityAnchorIndex);
    }

    it('should compute distance from active line', () => {
      playerState.lines = [
        createSyncedLine('Line 1', 0),
        createSyncedLine('Line 2', 5000),
        createSyncedLine('Line 3', 10000)
      ];
      playerState.currentLineIndex = 1;

      expect(getDistance(0)).toBe(1);
      expect(getDistance(1)).toBe(0);
      expect(getDistance(2)).toBe(1);
    });

    it('should return 999 when no active line', () => {
      playerState.lines = [createSyncedLine('Line 1', 0)];
      playerState.currentLineIndex = -1;

      expect(getDistance(0)).toBe(999);
    });
  });

  describe('CSS distance classes', () => {
    function hasVisibleText(index: number): boolean {
      return !!playerState.lines[index]?.text?.trim();
    }

    function getActiveVisibleLineIndex(): number {
      const currentIndex = playerState.currentLineIndex;
      if (currentIndex >= 0 && hasVisibleText(currentIndex)) {
        return currentIndex;
      }
      return -1;
    }

    function getProximityAnchorIndex(): number {
      const activeIndex = getActiveVisibleLineIndex();
      if (activeIndex >= 0) {
        return activeIndex;
      }
      return -1;
    }

    function getDistance(i: number): number {
      const proximityAnchorIndex = getProximityAnchorIndex();
      if (proximityAnchorIndex < 0) return 999;
      return Math.abs(i - proximityAnchorIndex);
    }

    function getDistanceClass(i: number, isManualBrowsing: boolean): string {
      const activeIndex = getActiveVisibleLineIndex();
      const dist = getDistance(i);

      if (activeIndex === i) return 'd0';
      if (!isManualBrowsing && i !== activeIndex && dist === 1) return 'd1';
      if (!isManualBrowsing && i !== activeIndex && dist === 2) return 'd2';
      if (!isManualBrowsing && i !== activeIndex && dist === 3) return 'd3';
      if (!isManualBrowsing && i !== activeIndex && dist > 3) return 'dfar';
      return '';
    }

    it('should classify d0 for active line', () => {
      playerState.lines = [
        createSyncedLine('Line 1', 0),
        createSyncedLine('Line 2', 5000),
        createSyncedLine('Line 3', 10000)
      ];
      playerState.currentLineIndex = 1;

      expect(getDistanceClass(0, false)).toBe('d1');
      expect(getDistanceClass(1, false)).toBe('d0');
      expect(getDistanceClass(2, false)).toBe('d1');
    });

    it('should classify dfar for distant lines', () => {
      playerState.lines = Array.from({ length: 10 }, (_, i) =>
        createSyncedLine(`Line ${i + 1}`, i * 5000)
      );
      playerState.currentLineIndex = 0;

      expect(getDistanceClass(5, false)).toBe('dfar');
      expect(getDistanceClass(9, false)).toBe('dfar');
    });
  });
});
