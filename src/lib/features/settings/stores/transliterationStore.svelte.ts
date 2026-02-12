const STORAGE_KEY = 'lyria_transliteration_enabled';
const PREFS_KEY = 'lyria_transliteration_prefs';

interface TransliterationPrefs {
  autoEnableFor: string[];
  notificationSeenFor: string[];
}

function getStoredEnabled(): boolean {
  if (globalThis.window === undefined) return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'true';
}

function getStoredPrefs(): TransliterationPrefs {
  if (globalThis.window === undefined) {
    return {
      autoEnableFor: ['ja', 'zh', 'ko', 'el', 'ru', 'ar', 'he', 'th'],
      notificationSeenFor: []
    };
  }
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {
    autoEnableFor: ['ja', 'zh', 'ko', 'el', 'ru', 'ar', 'he', 'th'],
    notificationSeenFor: []
  };
}

function saveEnabled(value: boolean): void {
  if (globalThis.window === undefined) return;
  localStorage.setItem(STORAGE_KEY, value.toString());
}

function savePrefs(prefs: TransliterationPrefs): void {
  if (globalThis.window === undefined) return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export const transliterationStore = $state({
  enabled: getStoredEnabled(),
  prefs: getStoredPrefs()
});

export function toggleTransliteration(): void {
  transliterationStore.enabled = !transliterationStore.enabled;
  saveEnabled(transliterationStore.enabled);
}

export function setTransliterationEnabled(value: boolean): void {
  transliterationStore.enabled = value;
  saveEnabled(value);
}

export function markNotificationSeen(videoId: string): void {
  if (!transliterationStore.prefs.notificationSeenFor.includes(videoId)) {
    transliterationStore.prefs.notificationSeenFor.push(videoId);
    savePrefs(transliterationStore.prefs);
  }
}

export function hasSeenNotification(videoId: string): boolean {
  return transliterationStore.prefs.notificationSeenFor.includes(videoId);
}

export function isLanguageAutoEnabled(lang: string): boolean {
  return transliterationStore.prefs.autoEnableFor.includes(lang);
}

export function addAutoEnableLanguage(lang: string): void {
  if (!transliterationStore.prefs.autoEnableFor.includes(lang)) {
    transliterationStore.prefs.autoEnableFor.push(lang);
    savePrefs(transliterationStore.prefs);
  }
}

export function removeAutoEnableLanguage(lang: string): void {
  const index = transliterationStore.prefs.autoEnableFor.indexOf(lang);
  if (index > -1) {
    transliterationStore.prefs.autoEnableFor.splice(index, 1);
    savePrefs(transliterationStore.prefs);
  }
}

export function isTransliterableLanguage(lang: string): boolean {
  const transliterableLanguages = [
    'ja', // Japanese
    'zh', // Chinese
    'ko', // Korean
    'el', // Greek
    'ru', // Russian
    'ar', // Arabic
    'he', // Hebrew
    'th', // Thai
    'uk', // Ukrainian
    'bg', // Bulgarian
    'sr', // Serbian
    'mk', // Macedonian
    'hi', // Hindi
    'bn', // Bengali
    'ta', // Tamil
    'te', // Telugu
    'ka', // Georgian
    'hy', // Armenian
    'yi' // Yiddish
  ];
  return transliterableLanguages.includes(lang.toLowerCase());
}
