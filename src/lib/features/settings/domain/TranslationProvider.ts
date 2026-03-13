export type DetectedLanguageCandidate = {
  language: string;
  percentage: number;
};

export type TranslationResponse = {
  translatedText: string[];
  alternatives?: string[];
  detectedSourceLanguage?: string;
  percentageOfDetectedLanguages?: number;
  detectedLanguages?: DetectedLanguageCandidate[];
  isSameLanguage?: boolean;
};

export interface TranslationProvider {
  translate(
    sourceLanguage: string,
    targetLanguage: string | undefined,
    text: string[],
    context?: string
  ): Promise<TranslationResponse>;

  detectLanguages(text: string[]): Promise<DetectedLanguageCandidate[]>;
  detectLanguage(text: string[]): Promise<string | undefined>;
}
