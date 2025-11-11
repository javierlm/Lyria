export const supportedLanguages: Map<string, string> = new Map([
	['AR', 'Arabic'],
	['BG', 'Bulgarian'],
	['CS', 'Czech'],
	['DA', 'Danish'],
	['DE', 'German'],
	['EL', 'Greek'],
	['EN', 'English'],
	['EN-GB', 'English (British)'],
	['EN-US', 'English (American)'],
	['ES', 'Spanish'],
	['ES-419', 'Spanish (Latin American)'],
	['ET', 'Estonian'],
	['FI', 'Finnish'],
	['FR', 'French'],
	['HE', 'Hebrew'],
	['HU', 'Hungarian'],
	['ID', 'Indonesian'],
	['IT', 'Italian'],
	['JA', 'Japanese'],
	['KO', 'Korean'],
	['LT', 'Lithuanian'],
	['LV', 'Latvian'],
	['NB', 'Norwegian Bokmål'],
	['NL', 'Dutch'],
	['PL', 'Polish'],
	['PT', 'Portuguese'],
	['PT-BR', 'Portuguese (Brazilian)'],
	['PT-PT', 'Portuguese (Portugal)'],
	['RO', 'Romanian'],
	['RU', 'Russian'],
	['SK', 'Slovak'],
	['SL', 'Slovenian'],
	['SV', 'Swedish'],
	['TH', 'Thai'],
	['TR', 'Turkish'],
	['UK', 'Ukrainian'],
	['VI', 'Vietnamese'],
	['ZH', 'Chinese'],
	['ZH-HANS', 'Chinese (simplified)'],
	['ZH-HANT', 'Chinese (traditional)']
]);

export function getLanguage(): string {
	if (typeof window === 'undefined') {
		return 'EN-US';
	}

	const savedLanguage = localStorage.getItem('language');
	if (savedLanguage && supportedLanguages.has(savedLanguage)) {
		return savedLanguage;
	}

	const browserLanguage = navigator.language.split('-')[0].toUpperCase();
	if (supportedLanguages.has(browserLanguage)) {
		return browserLanguage;
	}

	return 'EN-US';
}

export function setLanguage(language: string) {
	if (typeof window !== 'undefined' && supportedLanguages.has(language)) {
		localStorage.setItem('language', language);
	}
}
