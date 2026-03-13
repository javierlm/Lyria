import { ChromeAITranslationProvider } from './ChromeAITranslationProvider';
import { translationStore } from '../stores/translationStore.svelte';
import type { DetectedLanguageCandidate, TranslationResponse } from '../domain/TranslationProvider';

class FrontendTranslationService {
  private readonly chromeProvider: ChromeAITranslationProvider;

  private isDownloadProgressEvent(
    event: Event
  ): event is Event & { loaded: number; total: number } {
    return 'loaded' in event && 'total' in event;
  }

  constructor() {
    this.chromeProvider = new ChromeAITranslationProvider((monitor) => {
      monitor.addEventListener('downloadprogress', (event: Event) => {
        if (!this.isDownloadProgressEvent(event)) {
          return;
        }

        translationStore.updateDownloadProgress(event.loaded, event.total);
      });
    });
  }

  async detectSourceLanguage(text: string[]): Promise<string | undefined> {
    if (translationStore.useChromeAI && translationStore.isChromeAISupported) {
      const detected = await this.detectSourceLanguages(text);
      return detected[0]?.language || 'en';
    }
    return undefined;
  }

  async detectSourceLanguages(text: string[]): Promise<DetectedLanguageCandidate[]> {
    if (translationStore.useChromeAI && translationStore.isChromeAISupported) {
      return this.chromeProvider.detectLanguages(text);
    }

    return [];
  }

  async translate(
    text: string[],
    targetLang: string,
    sourceLang: string = 'auto',
    context?: { id?: string | number; artist?: string; track?: string }
  ): Promise<TranslationResponse | null> {
    if (translationStore.useChromeAI && translationStore.isChromeAISupported) {
      let finalSourceLang = sourceLang;
      let detectedLanguages: DetectedLanguageCandidate[] = [];

      if (finalSourceLang === 'auto') {
        detectedLanguages = await this.detectSourceLanguages(text);
        finalSourceLang = detectedLanguages[0]?.language || 'en';
      }

      const availability = await translationStore.checkLanguagePairAvailability(
        finalSourceLang,
        targetLang
      );

      if (availability !== 'no') {
        const result = await this.chromeProvider.translate(finalSourceLang, targetLang, text);

        if (detectedLanguages.length > 0) {
          result.detectedLanguages = detectedLanguages;
          result.detectedSourceLanguage = detectedLanguages[0].language;
          result.percentageOfDetectedLanguages = detectedLanguages[0].percentage;
        }

        if (
          sourceLang === 'auto' &&
          result.detectedSourceLanguage &&
          !result.percentageOfDetectedLanguages
        ) {
          result.percentageOfDetectedLanguages = 100;
        }

        translationStore.wasLastTranslationLocal = true;
        translationStore.markLanguagePairAsReady(finalSourceLang, targetLang);
        return result;
      }
      // Language pair not available for local translation, fall through to server
    }

    translationStore.wasLastTranslationLocal = false;
    return this.translateViaServer(text, targetLang, sourceLang, context);
  }

  private async translateViaServer(
    text: string[],
    targetLang: string,
    sourceLang: string,
    context?: { id?: string | number; artist?: string; track?: string }
  ): Promise<TranslationResponse | null> {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          text,
          id: context?.id,
          artist: context?.artist,
          track: context?.track
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Server translation failed: ${response.status}`);
      }

      return await response.json();
    } catch {
      return null;
    }
  }
}

export const frontendTranslationService = new FrontendTranslationService();
