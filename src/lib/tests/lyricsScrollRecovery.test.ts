import { describe, expect, it } from 'vitest';
import {
  findNextVisibleLineIndex,
  getInitialTargetLineIndex,
  getUpcomingVisibleLineIndex,
  hasVisibleText,
  type ScrollLine
} from '$lib/features/player/services/lyricsScrollRecovery';

const lines: ScrollLine[] = [
  { text: '', startTimeMs: 0 },
  { text: 'Line 1', startTimeMs: 1000 },
  { text: '   ', startTimeMs: 2000 },
  { text: 'Line 2', startTimeMs: 3000 }
];

describe('lyricsScrollRecovery helpers', () => {
  it('detects visible text correctly', () => {
    expect(hasVisibleText(lines, 0)).toBe(false);
    expect(hasVisibleText(lines, 1)).toBe(true);
    expect(hasVisibleText(lines, 2)).toBe(false);
    expect(hasVisibleText(lines, 3)).toBe(true);
  });

  it('finds next visible line index', () => {
    expect(findNextVisibleLineIndex(lines, 0)).toBe(1);
    expect(findNextVisibleLineIndex(lines, 2)).toBe(3);
    expect(findNextVisibleLineIndex(lines, 4)).toBe(-1);
  });

  it('computes upcoming visible line for synced lyrics', () => {
    expect(
      getUpcomingVisibleLineIndex({
        lines,
        currentLineIndex: 1,
        currentTimeSeconds: 0,
        timingOffsetMs: 0,
        lyricsAreSynced: true
      })
    ).toBe(3);
  });

  it('returns -1 upcoming when lyrics are not synced', () => {
    expect(
      getUpcomingVisibleLineIndex({
        lines,
        currentLineIndex: -1,
        currentTimeSeconds: 0,
        timingOffsetMs: 0,
        lyricsAreSynced: false
      })
    ).toBe(-1);
  });

  it('selects active line first for initial target', () => {
    expect(
      getInitialTargetLineIndex({
        lines,
        currentLineIndex: 1,
        currentTimeSeconds: 0,
        timingOffsetMs: 0,
        lyricsAreSynced: true
      })
    ).toBe(1);
  });

  it('falls back to upcoming line when no active', () => {
    expect(
      getInitialTargetLineIndex({
        lines,
        currentLineIndex: -1,
        currentTimeSeconds: 1.1,
        timingOffsetMs: 0,
        lyricsAreSynced: true
      })
    ).toBe(3);
  });

  it('falls back to first visible line when no upcoming', () => {
    expect(
      getInitialTargetLineIndex({
        lines,
        currentLineIndex: -1,
        currentTimeSeconds: 999,
        timingOffsetMs: 0,
        lyricsAreSynced: true
      })
    ).toBe(1);
  });
});
