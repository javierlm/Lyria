import type {
  DetectedLanguageCandidate,
  TranslationProvider,
  TranslationResponse
} from '../domain/TranslationProvider';

// Type definitions for the experimental Chrome AI API
declare global {
  interface Window {
    ai?: {
      languageDetector?: {
        capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
        create(options?: { monitor?: (monitor: EventTarget) => void }): Promise<{
          detect(text: string): Promise<Array<{ detectedLanguage: string; confidence: number }>>;
        }>;
      };
      translator?: {
        capabilities(): Promise<{
          available: 'readily' | 'after-download' | 'no';
          languagePairAvailable(
            source: string,
            target: string
          ): 'readily' | 'after-download' | 'no';
        }>;
        create(options: {
          sourceLanguage: string;
          targetLanguage: string;
          monitor?: (monitor: EventTarget) => void;
        }): Promise<{ translate(text: string): Promise<string> }>;
      };
    };

    translation?: {
      canTranslate(options: {
        sourceLanguage: string;
        targetLanguage: string;
      }): Promise<'readily' | 'after-download' | 'no'>;
      createTranslator(options: { sourceLanguage: string; targetLanguage: string }): Promise<{
        translate(text: string): Promise<string>;
      }>;
    };
  }
}

export class ChromeAITranslationProvider implements TranslationProvider {
  private readonly monitorCallback?: (monitor: EventTarget) => void;
  private readonly LINE_SAMPLE_LIMIT = 12;
  private readonly LINE_MIN_LENGTH = 8;

  private getGlobalTranslator():
    | {
        create(options: {
          sourceLanguage: string;
          targetLanguage: string;
          monitor?: (monitor: EventTarget) => void;
        }): Promise<{ translate(text: string): Promise<string> }>;
      }
    | undefined {
    return (
      globalThis as unknown as {
        Translator?: {
          create(options: {
            sourceLanguage: string;
            targetLanguage: string;
            monitor?: (monitor: EventTarget) => void;
          }): Promise<{ translate(text: string): Promise<string> }>;
        };
      }
    ).Translator;
  }

  private getGlobalLanguageDetector():
    | {
        create(options?: { monitor?: (monitor: EventTarget) => void }): Promise<{
          detect(text: string): Promise<Array<{ detectedLanguage: string; confidence: number }>>;
        }>;
      }
    | undefined {
    return (
      self as unknown as {
        LanguageDetector?: {
          create(options?: { monitor?: (monitor: EventTarget) => void }): Promise<{
            detect(text: string): Promise<Array<{ detectedLanguage: string; confidence: number }>>;
          }>;
        };
      }
    ).LanguageDetector;
  }

  constructor(monitorCallback?: (monitor: EventTarget) => void) {
    this.monitorCallback = monitorCallback;
  }

  private getDetectionSamples(text: string[]): string[] {
    const meaningfulLines = text
      .map((line) => line.trim())
      .filter((line) => line.length >= this.LINE_MIN_LENGTH)
      .slice(0, this.LINE_SAMPLE_LIMIT);

    if (meaningfulLines.length > 0) {
      return meaningfulLines;
    }

    const combinedText = text.join(' ').trim();
    return combinedText ? [combinedText] : [];
  }

  private async createTranslator(source: string, target: string) {
    if (window.ai?.translator) {
      return window.ai.translator.create({
        sourceLanguage: source,
        targetLanguage: target,
        monitor: this.monitorCallback
      });
    }

    if ('Translator' in globalThis) {
      const translator = this.getGlobalTranslator();
      if (translator) {
        return translator.create({
          sourceLanguage: source,
          targetLanguage: target,
          monitor: this.monitorCallback
        });
      }
    }

    if (window.translation) {
      return window.translation.createTranslator({
        sourceLanguage: source,
        targetLanguage: target
      });
    }

    throw new Error('Chrome AI Translation API is not available.');
  }

  async translate(
    sourceLanguage: string,
    targetLanguage: string | undefined,
    text: string[]
  ): Promise<TranslationResponse> {
    if (typeof window === 'undefined') {
      throw new Error('Chrome AI Translation is only available in the browser.');
    }

    if (!targetLanguage) {
      throw new Error('Target language is required for Chrome AI translation.');
    }

    const source = sourceLanguage.split('-')[0].toLowerCase();
    const target = targetLanguage.split('-')[0].toLowerCase();

    const translator = await this.createTranslator(source, target);
    const translatedTexts: string[] = [];

    for (const line of text) {
      if (!line.trim()) {
        translatedTexts.push('');
        continue;
      }
      try {
        const result = await translator.translate(line);
        translatedTexts.push(result);
      } catch {
        translatedTexts.push(line);
      }
    }

    return {
      translatedText: translatedTexts,
      detectedSourceLanguage: source,
      isSameLanguage: source === target
    };
  }

  async detectLanguages(text: string[]): Promise<DetectedLanguageCandidate[]> {
    if (typeof window === 'undefined') return [];

    const sampleTexts = this.getDetectionSamples(text);
    if (sampleTexts.length === 0) return [];

    try {
      let detector:
        | {
            detect(text: string): Promise<Array<{ detectedLanguage: string; confidence: number }>>;
          }
        | undefined;

      if (window.ai?.languageDetector) {
        detector = await window.ai.languageDetector.create({ monitor: this.monitorCallback });
      } else if ('LanguageDetector' in self) {
        const languageDetector = this.getGlobalLanguageDetector();
        if (languageDetector) {
          detector = await languageDetector.create({ monitor: this.monitorCallback });
        }
      }

      if (detector) {
        const languageScores = new Map<string, number>();

        for (const sampleText of sampleTexts) {
          const results = await detector.detect(sampleText);

          for (const result of results ?? []) {
            languageScores.set(
              result.detectedLanguage,
              (languageScores.get(result.detectedLanguage) ?? 0) + result.confidence
            );
          }
        }

        const totalScore = [...languageScores.values()].reduce((sum, score) => sum + score, 0);

        if (totalScore === 0) {
          return [];
        }

        return [...languageScores.entries()]
          .map(([language, score]) => ({
            language,
            percentage: (score / totalScore) * 100
          }))
          .filter((result) => result.percentage >= 5)
          .sort((a, b) => b.percentage - a.percentage);
      }
    } catch {
      // Detection failed silently
    }

    return [];
  }

  async detectLanguage(text: string[]): Promise<string | undefined> {
    const detectedLanguages = await this.detectLanguages(text);
    return detectedLanguages[0]?.language;
  }
}
