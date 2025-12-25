import { type TranslationProvider, type TranslationResponse } from '../domain/TranslationProvider';
import * as deepl from 'deepl-node';
import { DEEPL_API_KEY } from '$env/static/private';
import { getPrimaryLanguage } from '$lib/shared/utils';

const CONFIDENCE_THRESHOLD = 0.8;

if (!DEEPL_API_KEY) {
  throw new Error('DEEPL_API_KEY is not set in environment variables.');
}
const deeplClient = new deepl.DeepLClient(DEEPL_API_KEY);

// Map app language codes to DeepL-compatible codes
function mapToDeepLSourceLanguage(lang: string): deepl.SourceLanguageCode | null {
  if (lang === 'auto') return null;

  // DeepL source languages don't use region variants, use base language code
  return getPrimaryLanguage(lang).toUpperCase() as deepl.SourceLanguageCode;
}

function mapToDeepLTargetLanguage(lang: string | undefined): deepl.TargetLanguageCode {
  if (!lang) return 'EN-US' as deepl.TargetLanguageCode;

  const upper = lang.toUpperCase();

  // DeepL requires specific region variants for some target languages
  const targetMap: Record<string, string> = {
    EN: 'EN-US',
    'EN-GB': 'EN-GB',
    'EN-US': 'EN-US',
    PT: 'PT-PT',
    'PT-BR': 'PT-BR',
    'PT-PT': 'PT-PT',
    ZH: 'ZH',
    'ZH-HANS': 'ZH', // DeepL uses ZH for simplified Chinese
    'ZH-HANT': 'ZH', // DeepL doesn't support traditional Chinese as target
    ES: 'ES',
    'ES-419': 'ES' // DeepL doesn't have Latin American Spanish variant
  };

  // Check if we have a specific mapping
  if (targetMap[upper]) {
    return targetMap[upper] as deepl.TargetLanguageCode;
  }

  // Fallback to primary language code
  return getPrimaryLanguage(lang).toUpperCase() as deepl.TargetLanguageCode;
}

export class DeepLTranslator implements TranslationProvider {
  async translate(
    sourceLanguage: string,
    targetLanguage: string | undefined,
    text: string[],
    context?: string
  ): Promise<TranslationResponse> {
    try {
      const detectedLang = await this.detectLanguage(text);
      const normalizedTarget = targetLanguage
        ? getPrimaryLanguage(targetLanguage).toLowerCase()
        : 'en';

      if (detectedLang && detectedLang === normalizedTarget) {
        console.log('Skipping translation, detected language matches target:', detectedLang);
        return {
          translatedText: text,
          detectedSourceLanguage: detectedLang,
          percentageOfDetectedLanguages: 100,
          isSameLanguage: true
        };
      }
    } catch (error) {
      console.warn('Error in language detection optimization:', error);
    }

    const mappedSource = mapToDeepLSourceLanguage(sourceLanguage);
    const mappedTarget = mapToDeepLTargetLanguage(targetLanguage);

    console.log('DeepL translation:', {
      originalSource: sourceLanguage,
      mappedSource,
      originalTarget: targetLanguage,
      mappedTarget
    });

    let textToTranslate = text;
    if (context) {
      textToTranslate = [context, ...text];
    }

    const results = await deeplClient.translateText(textToTranslate, mappedSource, mappedTarget, {
      formality: 'prefer_less',
      modelType: 'quality_optimized',
      preserveFormatting: true,
      splitSentences: 'off'
    });

    const translatedTexts: string[] = [];
    const languageCounts: { [key: string]: number } = {};
    let totalDetectedLanguagesCount = 0;

    if (results && results.length > 0) {
      results.forEach((result, index) => {
        // Skip context
        if (context && index === 0) return;

        translatedTexts.push(result.text);
        if (result.detectedSourceLang) {
          languageCounts[result.detectedSourceLang] =
            (languageCounts[result.detectedSourceLang] || 0) + 1;
          totalDetectedLanguagesCount++;
        }
      });
    }

    const translatedResponse: TranslationResponse = {
      translatedText: translatedTexts,
      alternatives: [] // DeepL API does not directly provide alternatives in this format
    };

    if (totalDetectedLanguagesCount > 0) {
      let mostFrequentLanguage: string | undefined;
      let maxCount = 0;

      for (const lang in languageCounts) {
        if (languageCounts[lang] > maxCount) {
          maxCount = languageCounts[lang];
          mostFrequentLanguage = lang;
        }
      }

      if (mostFrequentLanguage) {
        translatedResponse.detectedSourceLanguage = mostFrequentLanguage;
        translatedResponse.percentageOfDetectedLanguages =
          (maxCount / totalDetectedLanguagesCount) * 100;
      }
    }

    if (translatedResponse.translatedText.length === 0) {
      console.warn('Translation returned empty string or response was malformed.');
    }
    console.log('Letra traducida: ', translatedResponse);
    return translatedResponse;
  }

  async detectLanguage(text: string[]): Promise<string | undefined> {
    // Only run on server-side (Node.js environment)
    if (typeof window !== 'undefined') {
      console.warn('detectLanguage called in browser context, skipping');
      return undefined;
    }

    try {
      const { loadModule } = await import('cld3-asm');
      const factory = await loadModule();
      const identifier = factory.create();
      const combinedText = text.join(' ');
      const result = identifier.findLanguage(combinedText);

      identifier.dispose();

      if (result.is_reliable && result.probability > CONFIDENCE_THRESHOLD) {
        return result.language;
      }
      return undefined;
    } catch (error) {
      console.error('Error detecting language with cld3-asm:', error);
      return undefined;
    }
  }
}
