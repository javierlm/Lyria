type ModelStatus = 'ready' | 'downloading' | 'unavailable' | 'error' | 'checking';

type TranslatorAPI = {
  type: 'window.ai' | 'global' | 'legacy';
  create: (options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: any;
  }) => Promise<any>;
};

type LanguageStatus = 'readily' | 'after-download' | 'no';

class TranslationStore {
  isChromeAISupported = $state(false);
  useChromeAI = $state(false);
  downloadProgress = $state<{ loaded: number; total: number } | null>(null);
  modelStatus = $state<ModelStatus>('checking');
  wasLastTranslationLocal = $state(false);

  private readonly availabilityCache = new Map<string, LanguageStatus>();
  private translatorAPI: TranslatorAPI | null = null;

  constructor() {
    this.initialize();
  }

  private getTranslatorAPI(): TranslatorAPI | null {
    if (this.translatorAPI) return this.translatorAPI;
    if (globalThis.window === undefined) return null;

    if (window.ai?.translator) {
      this.translatorAPI = {
        type: 'window.ai',
        create: (opts) => window.ai!.translator!.create(opts)
      };
    } else if ('Translator' in self) {
      this.translatorAPI = {
        type: 'global',
        create: (opts) => (self as any).Translator.create(opts)
      };
    } else if (window.translation) {
      this.translatorAPI = {
        type: 'legacy',
        create: (opts) => window.translation!.createTranslator(opts)
      };
    }

    return this.translatorAPI;
  }

  async initialize() {
    if (globalThis.window === undefined) return;

    const storedPreference = localStorage.getItem('useChromeAI');
    if (storedPreference !== null) {
      this.useChromeAI = storedPreference === 'true';
    }

    await this.checkAvailability();
  }

  async checkAvailability() {
    if (globalThis.window === undefined) return;

    try {
      const api = this.getTranslatorAPI();

      if (!api) {
        this.isChromeAISupported = false;
        this.modelStatus = 'unavailable';
        return;
      }

      this.isChromeAISupported = true;
      this.modelStatus = 'ready';
    } catch {
      this.isChromeAISupported = false;
      this.modelStatus = 'error';
    }
  }

  async toggleChromeAI(enabled: boolean) {
    this.useChromeAI = enabled;
    if (globalThis.window !== undefined) {
      localStorage.setItem('useChromeAI', String(enabled));
    }

    if (enabled) {
      await this.downloadModel();
    }
  }

  async downloadModel() {
    try {
      this.modelStatus = 'downloading';

      const api = this.getTranslatorAPI();
      if (!api) return;

      const monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          this.updateDownloadProgress(e.loaded, e.total);
        });
      };

      await api.create({ sourceLanguage: 'en', targetLanguage: 'es', monitor });

      // Also try language detector
      if (window.ai?.languageDetector) {
        await window.ai.languageDetector.create({ monitor });
      } else if ('LanguageDetector' in self) {
        await (self as any).LanguageDetector.create({ monitor });
      }

      this.modelStatus = 'ready';
    } catch {
      this.modelStatus = 'error';
    }
  }

  updateDownloadProgress(loaded: number, total: number) {
    this.downloadProgress = { loaded, total };
    this.modelStatus = 'downloading';

    if (loaded >= total && total > 0) {
      this.modelStatus = 'ready';
      this.downloadProgress = null;
    }
  }

  resetDownloadProgress() {
    this.downloadProgress = null;
    if (this.modelStatus === 'downloading') {
      this.modelStatus = 'ready';
    }
  }

  markLanguagePairAsReady(source: string, target: string) {
    const src = source.split('-')[0].toLowerCase();
    const tgt = target.split('-')[0].toLowerCase();
    const cacheKey = `${src}->${tgt}`;

    if (this.availabilityCache.get(cacheKey) === 'after-download') {
      this.availabilityCache.set(cacheKey, 'readily');
    }
  }

  async checkLanguagePairAvailability(
    source: string,
    target: string
  ): Promise<'readily' | 'after-download' | 'no'> {
    if (!source || !target) return 'no';

    const src = source.split('-')[0].toLowerCase();
    const tgt = target.split('-')[0].toLowerCase();
    const cacheKey = `${src}->${tgt}`;

    const cached = this.availabilityCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      let availability: string | undefined;

      // Try the new global Translator API first (using capabilities)
      if ('Translator' in globalThis) {
        const TranslatorClass = (self as any).Translator;
        if (typeof TranslatorClass.availability === 'function') {
          availability = await TranslatorClass.availability({
            sourceLanguage: src,
            targetLanguage: tgt
          });
        }
      }
      // Fall back to window.ai.translator.capabilities
      if (!availability && window.ai?.translator?.capabilities) {
        const capabilities = await window.ai.translator.capabilities();
        availability = capabilities.languagePairAvailable(src, tgt);
      }
      // Fall back to legacy translation.canTranslate
      if (!availability && window.translation?.canTranslate) {
        availability = await window.translation.canTranslate({
          sourceLanguage: src,
          targetLanguage: tgt
        });
      }

      // Map the API response to our status values
      // Chrome AI returns: 'readily', 'after-download', 'no'
      // Some versions may return: 'available', 'downloadable', 'not-available'
      let result: 'readily' | 'after-download' | 'no';
      if (availability === 'readily' || availability === 'available') {
        result = 'readily';
      } else if (availability === 'after-download' || availability === 'downloadable') {
        result = 'after-download';
      } else {
        result = 'no';
      }

      this.availabilityCache.set(cacheKey, result);
      return result;
    } catch {
      this.availabilityCache.set(cacheKey, 'no');
      return 'no';
    }
  }
}

export const translationStore = new TranslationStore();
