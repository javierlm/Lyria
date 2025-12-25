export const supportedLanguages: Map<string, string> = new Map([
  ['AR', 'Arabic'],
  ['BG', 'Bulgarian'],
  ['CS', 'Czech'],
  ['DA', 'Danish'],
  ['DE', 'German'],
  ['EL', 'Greek'],
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

const DEFAULT_LANGUAGE = 'EN-US';

export function getLanguage(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  const savedLanguage = localStorage.getItem('language')?.toUpperCase();
  if (savedLanguage) {
    if (supportedLanguages.has(savedLanguage)) return savedLanguage;
    const savedBaseLanguage = savedLanguage.split('-')[0];
    if (supportedLanguages.has(savedBaseLanguage)) return savedBaseLanguage;
  }

  const navLangs =
    navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (const lang of navLangs) {
    if (!lang) continue;
    const upper = lang.toUpperCase();

    if (supportedLanguages.has(upper)) {
      return upper;
    }

    const base = upper.split('-')[0];
    if (supportedLanguages.has(base)) {
      return base;
    }
  }

  return DEFAULT_LANGUAGE;
}

export function setLanguage(language: string) {
  const upperCaseLanguage = language.toUpperCase();
  if (typeof window !== 'undefined' && supportedLanguages.has(upperCaseLanguage)) {
    localStorage.setItem('language', upperCaseLanguage);
  }
}
