import { describe, it, expect } from 'vitest';
import {
  clampScale,
  distanceBetweenPoints,
  MINI_PLAYER_MIN_SCALE,
  MINI_PLAYER_MAX_SCALE
} from '$lib/features/player/services/miniPlayerScale';

describe('miniPlayerScale utilities', () => {
  describe('clampScale', () => {
    it('should return the same value when within bounds', () => {
      expect(clampScale(1.0)).toBe(1.0);
      expect(clampScale(1.2)).toBe(1.2);
      expect(clampScale(MINI_PLAYER_MIN_SCALE)).toBe(MINI_PLAYER_MIN_SCALE);
      expect(clampScale(MINI_PLAYER_MAX_SCALE)).toBe(MINI_PLAYER_MAX_SCALE);
    });

    it('should clamp values below minimum', () => {
      expect(clampScale(0.5)).toBe(MINI_PLAYER_MIN_SCALE);
      expect(clampScale(0)).toBe(MINI_PLAYER_MIN_SCALE);
      expect(clampScale(-1)).toBe(MINI_PLAYER_MIN_SCALE);
    });

    it('should clamp values above maximum', () => {
      expect(clampScale(2.0)).toBe(MINI_PLAYER_MAX_SCALE);
      expect(clampScale(10)).toBe(MINI_PLAYER_MAX_SCALE);
    });

    it('should handle edge cases at boundaries', () => {
      expect(clampScale(MINI_PLAYER_MIN_SCALE - 0.01)).toBe(MINI_PLAYER_MIN_SCALE);
      expect(clampScale(MINI_PLAYER_MAX_SCALE + 0.01)).toBe(MINI_PLAYER_MAX_SCALE);
    });
  });

  describe('distanceBetweenPoints', () => {
    it('should return 0 for same point', () => {
      expect(distanceBetweenPoints(0, 0, 0, 0)).toBe(0);
      expect(distanceBetweenPoints(100, 100, 100, 100)).toBe(0);
    });

    it('should return correct horizontal distance', () => {
      expect(distanceBetweenPoints(0, 0, 100, 0)).toBe(100);
      expect(distanceBetweenPoints(50, 30, 150, 30)).toBe(100);
    });

    it('should return correct vertical distance', () => {
      expect(distanceBetweenPoints(0, 0, 0, 50)).toBe(50);
      expect(distanceBetweenPoints(10, 20, 10, 70)).toBe(50);
    });

    it('should return correct diagonal distance (Pythagorean)', () => {
      // 3-4-5 triangle
      expect(distanceBetweenPoints(0, 0, 3, 4)).toBe(5);
      // 5-12-13 triangle
      expect(distanceBetweenPoints(0, 0, 5, 12)).toBe(13);
    });

    it('should handle negative coordinates', () => {
      expect(distanceBetweenPoints(-10, -10, 10, 10)).toBeCloseTo(
        Math.sqrt(20 * 20 + 20 * 20)
      );
    });
  });

  describe('constants', () => {
    it('should have sensible min/max scale values', () => {
      expect(MINI_PLAYER_MIN_SCALE).toBeLessThan(1);
      expect(MINI_PLAYER_MAX_SCALE).toBeGreaterThan(1);
      expect(MINI_PLAYER_MIN_SCALE).toBeLessThan(MINI_PLAYER_MAX_SCALE);
    });
  });
});
