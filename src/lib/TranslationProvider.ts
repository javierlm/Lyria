export type TranslationResponse = {
	translatedText: string[];
	alternatives?: string[];
	detectedSourceLanguage?: string;
	percentageOfDetectedLanguages?: number;
};

export interface TranslationProvider {
	translate(
		sourceLanguage: string,
		targetLanguage: string | undefined,
		text: string[]
	): Promise<TranslationResponse>;
}
