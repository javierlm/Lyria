import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import type { SyncedLine } from '$lib/features/player/services/lrclib';
import { createRequire } from 'module';

// Use createRequire to import CommonJS modules in ESM context
const require = createRequire(import.meta.url);

// Cache simple en memoria para transliteraciones
const transliterationCache = new Map<string, string[]>();

// Initialize kuroshiro once
let kuroshiroInstance: unknown = null;
let KuromojiAnalyzerClass: unknown = null;

async function initializeKuroshiro() {
  if (!kuroshiroInstance) {
    console.log('[Transliteration] Initializing Kuroshiro...');
    const Kuroshiro = require('kuroshiro');
    const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');

    console.log('[Transliteration] Kuroshiro module:', typeof Kuroshiro);
    console.log('[Transliteration] Kuroshiro.default:', typeof Kuroshiro.default);
    console.log('[Transliteration] KuromojiAnalyzer module:', typeof KuromojiAnalyzer);
    console.log('[Transliteration] KuromojiAnalyzer.default:', typeof KuromojiAnalyzer.default);

    kuroshiroInstance = new Kuroshiro.default();
    // KuromojiAnalyzer se exporta directamente como función, no como default
    KuromojiAnalyzerClass = KuromojiAnalyzer.default || KuromojiAnalyzer;

    console.log('[Transliteration] Creating analyzer instance...');
    const analyzer = new (KuromojiAnalyzerClass as new () => unknown)();
    console.log('[Transliteration] Analyzer created, initializing...');

    await (kuroshiroInstance as { init: (analyzer: unknown) => Promise<void> }).init(analyzer);
    console.log('[Transliteration] Kuroshiro initialization complete');
  }
  return kuroshiroInstance as { convert: (text: string, options: unknown) => Promise<string> };
}

function generateCacheKey(language: string, text: string[]): string {
  return `${language}-${text.join('|')}`;
}

export const POST: RequestHandler = async ({ request }) => {
  const { language, lines } = await request.json();

  if (!language || !lines || !Array.isArray(lines)) {
    return json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const cacheKey = generateCacheKey(
    language,
    lines.map((l: SyncedLine) => l.text)
  );
  const cached = transliterationCache.get(cacheKey);

  if (cached) {
    console.log('[Transliteration] Cache hit');
    return json({
      transliteratedLines: lines.map((line: SyncedLine, index: number) => ({
        startTimeMs: line.startTimeMs,
        text: cached[index]
      }))
    });
  }

  try {
    const transliterated = await transliterateLines(lines, language);

    // Guardar en cache
    transliterationCache.set(
      cacheKey,
      transliterated.map((l) => l.text)
    );

    return json({ transliteratedLines: transliterated });
  } catch (error) {
    console.error('[Transliteration] Error:', error);
    return json({ error: 'Transliteration failed' }, { status: 500 });
  }
};

async function transliterateLines(lines: SyncedLine[], language: string): Promise<SyncedLine[]> {
  const normalizedLang = language.toLowerCase().split('-')[0];

  switch (normalizedLang) {
    case 'ja':
      return await transliterateJapanese(lines);
    case 'zh':
      return await transliterateChinese(lines);
    case 'ko':
      return await transliterateKorean(lines);
    case 'el':
      return await transliterateGreek(lines);
    case 'ru':
    case 'uk':
    case 'bg':
    case 'sr':
    case 'mk':
      // Use iuliia for Cyrillic languages (better quality)
      return await transliterateCyrillic(lines, normalizedLang);
    case 'ar':
    case 'he':
    case 'th':
    case 'hi':
    case 'bn':
    case 'ta':
    case 'te':
    case 'ka':
    case 'hy':
    case 'yi':
      // Use generic transliteration for Arabic, Hebrew, and other scripts
      return await transliterateGeneric(lines);
    default:
      // For other languages, return as-is
      return lines;
  }
}

async function transliterateJapanese(lines: SyncedLine[]): Promise<SyncedLine[]> {
  console.log(
    '[Transliteration] Processing Japanese lines:',
    lines.map((l) => l.text)
  );

  const kuroshiro = await initializeKuroshiro();
  console.log('[Transliteration] Kuroshiro initialized, instance type:', typeof kuroshiro);
  console.log('[Transliteration] Kuroshiro has convert:', 'convert' in (kuroshiro as object));

  const transliterated: SyncedLine[] = [];

  for (const line of lines) {
    try {
      console.log('[Transliteration] Converting line:', line.text);
      const testLine = line.text.substring(0, 20); // Test with first 20 chars
      console.log('[Transliteration] Testing with:', testLine);

      const result = await (
        kuroshiro as { convert: (text: string, options: object) => Promise<string> }
      ).convert(testLine, {
        to: 'romaji',
        mode: 'normal'
      });

      console.log('[Transliteration] Result:', result);
      console.log('[Transliteration] Result type:', typeof result);
      console.log('[Transliteration] Result length:', result.length);
      console.log('[Transliteration] Result equals input:', result === testLine);

      transliterated.push({
        startTimeMs: line.startTimeMs,
        text: result
      });
    } catch (error) {
      console.error('[Transliteration] Error converting line:', line.text, error);
      // If conversion fails, keep original
      transliterated.push(line);
    }
  }

  console.log(
    '[Transliteration] Final transliterated lines:',
    transliterated.map((l) => l.text)
  );
  return transliterated;
}

async function transliterateChinese(lines: SyncedLine[]): Promise<SyncedLine[]> {
  const { pinyin } = await import('pinyin-pro');

  return lines.map((line) => ({
    startTimeMs: line.startTimeMs,
    text: pinyin(line.text, {
      toneType: 'symbol',
      type: 'string',
      nonZh: 'consecutive'
    })
  }));
}

async function transliterateKorean(lines: SyncedLine[]): Promise<SyncedLine[]> {
  const { romanize } = await import('es-hangul');

  return lines.map((line) => ({
    startTimeMs: line.startTimeMs,
    text: line.text
      .split(/\s+/)
      .map((word) => {
        try {
          return romanize(word);
        } catch {
          return word;
        }
      })
      .join(' ')
  }));
}

async function transliterateGreek(lines: SyncedLine[]): Promise<SyncedLine[]> {
  const greekUtilsModule = await import('greek-utils');
  const greekUtils = greekUtilsModule.default || greekUtilsModule;

  return lines.map((line) => ({
    startTimeMs: line.startTimeMs,
    text: greekUtils.toTransliteratedLatin(line.text)
  }));
}

async function transliterateCyrillic(lines: SyncedLine[], _lang: string): Promise<SyncedLine[]> {
  const iuliia = await import('iuliia');

  // Use Wikipedia schema (works well for all Cyrillic languages)
  const schema = iuliia.WIKIPEDIA;

  return lines.map((line) => ({
    startTimeMs: line.startTimeMs,
    text: iuliia.translate(line.text, schema)
  }));
}

async function transliterateGeneric(lines: SyncedLine[]): Promise<SyncedLine[]> {
  const { transliterate } = await import('transliteration');

  return lines.map((line) => ({
    startTimeMs: line.startTimeMs,
    text: transliterate(line.text)
  }));
}
