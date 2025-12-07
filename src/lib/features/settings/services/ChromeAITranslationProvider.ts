import type { TranslationProvider, TranslationResponse } from '../domain/TranslationProvider';

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
	private monitorCallback?: (monitor: EventTarget) => void;

	constructor(monitorCallback?: (monitor: EventTarget) => void) {
		this.monitorCallback = monitorCallback;
	}

	private async createTranslator(source: string, target: string) {
		if (window.ai?.translator) {
			return window.ai.translator.create({
				sourceLanguage: source,
				targetLanguage: target,
				monitor: this.monitorCallback
			});
		}

		if ('Translator' in self) {
			return (self as any).Translator.create({
				sourceLanguage: source,
				targetLanguage: target,
				monitor: this.monitorCallback
			});
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

	async detectLanguage(text: string[]): Promise<string | undefined> {
		if (typeof window === 'undefined') return undefined;

		const sampleText = text.slice(0, 5).join(' ').trim();
		if (!sampleText) return undefined;

		try {
			let detector;

			if (window.ai?.languageDetector) {
				detector = await window.ai.languageDetector.create({ monitor: this.monitorCallback });
			} else if ('LanguageDetector' in self) {
				detector = await (self as any).LanguageDetector.create({ monitor: this.monitorCallback });
			}

			if (detector) {
				const results = await detector.detect(sampleText);
				if (results?.length > 0) {
					return results[0].detectedLanguage;
				}
			}
		} catch {
			// Detection failed silently
		}

		return undefined;
	}
}
