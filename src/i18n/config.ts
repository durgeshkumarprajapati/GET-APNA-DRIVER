export const SUPPORTED_LOCALES = [
  'en',
  'hi',
  'gu',
  'mr',
  'ta',
  'te',
  'kn',
  'ml',
  'pa',
  'bn',
] as const;

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
  en: { code: 'en', label: 'English', nativeName: 'English', flag: '🇬🇧' },
  hi: { code: 'hi', label: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  gu: { code: 'gu', label: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  mr: { code: 'mr', label: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  ta: { code: 'ta', label: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  te: { code: 'te', label: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  kn: { code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  ml: { code: 'ml', label: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  pa: { code: 'pa', label: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  bn: { code: 'bn', label: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
};

export function isValidLocale(locale: unknown): locale is SupportedLocale {
  return typeof locale === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}
