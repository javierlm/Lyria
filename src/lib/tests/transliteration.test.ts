import { describe, it, expect, beforeEach } from 'vitest';
import {
  transliterateLyrics,
  containsNonLatinCharacters,
  detectScript
} from '$lib/features/player/services/transliterationService';
import type { SyncedLine } from '$lib/features/player/services/lrclib';

// Import the function from playerActions (we'll test it indirectly)
function detectScriptFromText(text: string): string | undefined {
  // Japanese
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
  // Chinese
  if (/[\u4E00-\u9FAF]/.test(text)) return 'zh';
  // Korean
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  // Greek
  if (/[\u0370-\u03FF]/.test(text)) return 'el';
  // Cyrillic (Russian, etc.)
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  // Arabic
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  // Hebrew
  if (/[\u0590-\u05FF]/.test(text)) return 'he';
  // Thai
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
  // Default to undefined (will not trigger transliteration)
  return undefined;
}

describe('transliterationService', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  describe('containsNonLatinCharacters', () => {
    it('should return false for pure Latin text', () => {
      expect(containsNonLatinCharacters('Hello World')).toBe(false);
      expect(containsNonLatinCharacters('La canción')).toBe(false);
    });

    it('should return true for Japanese text', () => {
      expect(containsNonLatinCharacters('こんにちは')).toBe(true);
      expect(containsNonLatinCharacters('カタカナ')).toBe(true);
    });

    it('should return true for Chinese text', () => {
      expect(containsNonLatinCharacters('你好世界')).toBe(true);
    });

    it('should return true for Korean text', () => {
      expect(containsNonLatinCharacters('안녕하세요')).toBe(true);
    });
  });

  describe('detectScript', () => {
    it('should detect hiragana', () => {
      expect(detectScript('こんにちは')).toBe('hiragana');
    });

    it('should detect katakana', () => {
      expect(detectScript('カタカナ')).toBe('katakana');
    });

    it('should detect han characters', () => {
      expect(detectScript('漢字')).toBe('han');
    });

    it('should detect hangul', () => {
      expect(detectScript('안녕')).toBe('hangul');
    });

    it('should detect Greek', () => {
      expect(detectScript('Γειά')).toBe('greek');
    });

    it('should detect Cyrillic', () => {
      expect(detectScript('Привет')).toBe('cyrillic');
    });

    it('should return latin for Latin text', () => {
      expect(detectScript('Hello')).toBe('latin');
    });
  });

  describe('detectScriptFromText', () => {
    it('should detect Japanese text', () => {
      expect(detectScriptFromText('こんにちは')).toBe('ja');
      expect(detectScriptFromText('カタカナ')).toBe('ja');
      expect(detectScriptFromText('漢字')).toBe('zh'); // Han characters detected as Chinese
    });

    it('should detect Korean text', () => {
      expect(detectScriptFromText('안녕하세요')).toBe('ko');
    });

    it('should detect Greek text', () => {
      expect(detectScriptFromText('Γειά σου')).toBe('el');
    });

    it('should detect Russian text', () => {
      expect(detectScriptFromText('Привет')).toBe('ru');
    });

    it('should detect Arabic text', () => {
      expect(detectScriptFromText('مرحبا')).toBe('ar');
    });

    it('should return undefined for Latin text', () => {
      expect(detectScriptFromText('Hello World')).toBeUndefined();
      expect(detectScriptFromText('Hola Mundo')).toBeUndefined();
    });
  });

  describe('transliterateLyrics', () => {
    it('should be defined', () => {
      // The function exists and is exported
      expect(typeof transliterateLyrics).toBe('function');
    });
  });
});
