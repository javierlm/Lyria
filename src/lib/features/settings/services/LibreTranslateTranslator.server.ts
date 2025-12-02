import { type TranslationProvider, type TranslationResponse } from '../domain/TranslationProvider';

export type LanguageDetection = {
	language: string;
	confidence: number;
};

const CONFIDENCE_THRESHOLD = 0.8;

export class LibreTranslateTranslator implements TranslationProvider {
	async detectLanguage(text: string[]): Promise<string | undefined> {
		try {
			const combinedText = text.join(' ');
			const res = await fetch('http://localhost:5000/detect', {
				method: 'POST',
				body: JSON.stringify({ q: combinedText }),
				headers: { 'Content-Type': 'application/json' }
			});

			if (!res.ok) {
				throw new Error(
					`Language detection API failed with status ${res.status}: ${await res.text()}`
				);
			}

			const detections: LanguageDetection[] = await res.json();

			if (detections && detections.length > 0) {
				const topDetection = detections[0];
				if (topDetection.confidence > CONFIDENCE_THRESHOLD) {
					return topDetection.language;
				}
			}

			return undefined;
		} catch (error) {
			console.error('Error detecting language with LibreTranslate:', error);
			return undefined;
		}
	}

	async translate(
		sourceLanguage: string,
		targetLanguage: string | undefined,
		text: string[],
		context?: string
	): Promise<TranslationResponse> {
		const body: {
			q: string[];
			source: string;
			target?: string;
			format: string;
			alternatives: number;
		} = {
			q: text,
			source: sourceLanguage || 'auto',
			format: 'text',
			alternatives: 3
		};
		if (targetLanguage) {
			body.target = targetLanguage;
		}
		const res = await fetch('http://localhost:5000/translate', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		});

		if (!res.ok) {
			throw new Error(`Translation API failed with status ${res.status}: ${await res.text()}`);
		}

		const responseData: TranslationResponse = await res.json();
		const translatedResponse: TranslationResponse = {
			translatedText: responseData?.translatedText || [],
			alternatives: responseData?.alternatives || []
		};

		if (translatedResponse.translatedText.length === 0) {
			console.warn('Translation returned empty string or response was malformed.');
		}
		console.log('Letra traducida: ', translatedResponse);
		return translatedResponse;
	}
}
