import type { LibreTranslateResponse } from './LibreTranslateTranslator';

export interface TranslationProvider {
	translate(
		sourceLanguage: string,
		targetLanguage: string | undefined,
		text: string[]
	): Promise<LibreTranslateResponse>;
}
