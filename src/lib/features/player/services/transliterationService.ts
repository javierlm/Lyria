import type { SyncedLine } from './lrclib';

// AbortController para cancelar operaciones en curso
let currentAbortController: AbortController | null = null;

export interface TransliterationResult {
  lines: SyncedLine[];
  language: string;
  success: boolean;
  error?: string;
}

export async function transliterateLyrics(
  lines: SyncedLine[],
  language: string,
  signal?: AbortSignal
): Promise<TransliterationResult> {
  // Cancelar operación anterior si existe
  currentAbortController?.abort();
  currentAbortController = new AbortController();

  const abortSignal = signal || currentAbortController.signal;

  try {
    const response = await fetch('/api/transliterate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language,
        lines
      }),
      signal: abortSignal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Transliteration failed');
    }

    const data = await response.json();
    console.log('[Transliteration] Backend response:', data);

    return {
      lines: data.transliteratedLines,
      language,
      success: true
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Transliteration cancelled');
    }

    console.error('Error transliterating lyrics:', error);
    return {
      lines: [],
      language,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function cancelCurrentTransliteration(): void {
  currentAbortController?.abort();
  currentAbortController = null;
}

// Detectar si un texto contiene caracteres que podrían necesitar transliteración
export function containsNonLatinCharacters(text: string): boolean {
  // Rango de caracteres latinos básicos + extendidos + IPA
  // Excluimos caracteres de control (0x00-0x1F) excepto espacios comunes
  const latinRegex =
    /^[\u0020-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u0250-\u02AF\u1E00-\u1EFF\s]*$/;
  return !latinRegex.test(text);
}

// Detectar el sistema de escritura predominante
export function detectScript(text: string): string {
  if (/[\u3040-\u309F]/.test(text)) return 'hiragana';
  if (/[\u30A0-\u30FF]/.test(text)) return 'katakana';
  if (/[\u4E00-\u9FAF]/.test(text)) return 'han';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'hangul';
  if (/[\u0370-\u03FF]/.test(text)) return 'greek';
  if (/[\u0400-\u04FF]/.test(text)) return 'cyrillic';
  if (/[\u0600-\u06FF]/.test(text)) return 'arabic';
  if (/[\u0590-\u05FF]/.test(text)) return 'hebrew';
  if (/[\u0E00-\u0E7F]/.test(text)) return 'thai';
  if (/[\u0900-\u097F]/.test(text)) return 'devanagari';
  return 'latin';
}
