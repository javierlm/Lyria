/**
 * Pure utility functions for mini player pinch-to-zoom.
 * Extracted for testability.
 */

export const MINI_PLAYER_MIN_SCALE = 0.8;
export const MINI_PLAYER_MAX_SCALE = 2.0;

export function clampScale(scale: number): number {
  return Math.max(MINI_PLAYER_MIN_SCALE, Math.min(MINI_PLAYER_MAX_SCALE, scale));
}

export function distanceBetweenPoints(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
