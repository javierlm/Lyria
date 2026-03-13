const LANGUAGE_TO_COUNTRY_CODE: Record<string, string> = {
  AR: 'sa',
  ARA: 'sa',
  ALB: 'al',
  BG: 'bg',
  BS: 'ba',
  CA: 'es',
  CS: 'cz',
  DA: 'dk',
  DE: 'de',
  EL: 'gr',
  EN: 'gb',
  'EN-GB': 'gb',
  'EN-US': 'us',
  ES: 'es',
  'ES-419': 'un',
  ET: 'ee',
  FA: 'ir',
  FI: 'fi',
  FR: 'fr',
  HE: 'il',
  HI: 'in',
  HR: 'hr',
  HU: 'hu',
  ID: 'id',
  IT: 'it',
  JA: 'jp',
  KO: 'kr',
  LT: 'lt',
  LV: 'lv',
  MS: 'my',
  NB: 'no',
  NL: 'nl',
  NO: 'no',
  PL: 'pl',
  PT: 'pt',
  'PT-BR': 'br',
  'PT-PT': 'pt',
  RO: 'ro',
  RU: 'ru',
  SK: 'sk',
  SL: 'si',
  SQ: 'al',
  SQI: 'al',
  SR: 'rs',
  SV: 'se',
  SW: 'ke',
  TH: 'th',
  TL: 'ph',
  TR: 'tr',
  UK: 'ua',
  UR: 'pk',
  VI: 'vn',
  ZH: 'cn',
  'ZH-HANS': 'cn',
  'ZH-HANT': 'tw'
};

function normalizeLocaleTag(locale: string): string {
  return locale.trim().replaceAll('_', '-') || 'en';
}

export function normalizeLanguageCode(languageCode: string): string {
  return languageCode.trim().replaceAll('_', '-').toUpperCase();
}

export function toLanguageTag(languageCode: string): string {
  return normalizeLanguageCode(languageCode)
    .split('-')
    .map((part, index) => {
      if (index === 0) {
        return part.toLowerCase();
      }

      if (part.length === 2) {
        return part.toUpperCase();
      }

      return `${part[0]}${part.slice(1).toLowerCase()}`;
    })
    .join('-');
}

export function getLanguageCountryCode(languageCode: string | null | undefined): string | null {
  if (!languageCode) {
    return null;
  }

  const normalizedCode = normalizeLanguageCode(languageCode);
  const exactCountryCode = LANGUAGE_TO_COUNTRY_CODE[normalizedCode];

  if (exactCountryCode) {
    return exactCountryCode;
  }

  const parts = normalizedCode.split('-');
  const region = parts.at(-1);

  if (parts.length > 1 && region?.length === 2) {
    return region.toLowerCase();
  }

  return LANGUAGE_TO_COUNTRY_CODE[parts[0]] ?? null;
}

export function getFlagUrl(countryCode: string | null | undefined): string | null {
  if (!countryCode) {
    return null;
  }

  const normalizedCountryCode = countryCode.trim().toLowerCase();

  if (!normalizedCountryCode) {
    return null;
  }

  return `https://flagcdn.com/${normalizedCountryCode}.svg`;
}

export function getLanguageFlagUrl(languageCode: string | null | undefined): string | null {
  return getFlagUrl(getLanguageCountryCode(languageCode));
}

export function getLanguageDisplayName(
  languageCode: string | null | undefined,
  displayLocale: string = 'en'
): string | null {
  if (!languageCode) {
    return null;
  }

  const normalizedCode = toLanguageTag(languageCode);
  const normalizedLocale = normalizeLocaleTag(displayLocale);

  try {
    const displayNames = new Intl.DisplayNames([normalizedLocale], { type: 'language' });
    return displayNames.of(normalizedCode) ?? normalizedCode;
  } catch {
    return normalizedCode;
  }
}
