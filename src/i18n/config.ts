export const SUPPORTED_LOCALES = ['en', 'hi', 'gu'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const LOCALE_COOKIE_NAME = 'gad_locale';

export interface LocaleMeta {
  code: SupportedLocale;
  label: string;
  nativeName: string;
  flag: string;
}

export const LOCALES_META: Record<SupportedLocale, LocaleMeta> = {
  en: {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
  },
  hi: {
    code: 'hi',
    label: 'Hindi',
    nativeName: 'हिंदी',
    flag: '🇮🇳',
  },
  gu: {
    code: 'gu',
    label: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
  },
};

export function isValidLocale(locale: unknown): locale is SupportedLocale {
  return typeof locale === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}
