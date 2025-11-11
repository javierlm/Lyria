import type { TranslationProvider } from './TranslationProvider';
import * as deepl from 'deepl-node';
import { DEEPL_API_KEY } from '$env/static/private';
import type { LibreTranslateResponse } from './LibreTranslateTranslator';

if (!DEEPL_API_KEY) {
	throw new Error('DEEPL_API_KEY is not set in environment variables.');
}
const deeplClient = new deepl.DeepLClient(DEEPL_API_KEY);

export class DeepLTranslator implements TranslationProvider {
	async translate(
		sourceLanguage: string,
		targetLanguage: string | undefined,
		text: string[]
	): Promise<LibreTranslateResponse> {
		const results = await deeplClient.translateText(
			text,
			sourceLanguage === 'auto' ? null : (sourceLanguage as deepl.SourceLanguageCode),
			targetLanguage as deepl.TargetLanguageCode
		);

		const translatedTexts = results ? results.map((result: deepl.TextResult) => result.text) : [];

		const translatedResponse: LibreTranslateResponse = {
			translatedText: translatedTexts,
			alternatives: [] // DeepL API does not directly provide alternatives in this format
		};

		if (translatedResponse.translatedText.length === 0) {
			console.warn('Translation returned empty string or response was malformed.');
		}
		console.log('Letra traducida: ', translatedResponse);
		return translatedResponse;
	}
}
