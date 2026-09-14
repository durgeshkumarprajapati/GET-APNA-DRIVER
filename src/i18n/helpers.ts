import { SupportedLocale } from './config';
import { dictionaries, Dictionary } from './locales';

/**
 * Resolves a dot-notated string key (e.g. 'common.actions.save' or 'booking.status.DRAFT')
 * in a dictionary object with optional parameter interpolation.
 */
export function getTranslationByKey(
  dict: Dictionary,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split('.');
  let current: unknown = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      // Fallback: return key itself if not found
      return key;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  let text = current;
  if (params) {
    for (const [pKey, pVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`{{${pKey}}}`, 'g'), String(pVal));
    }
  }

  return text;
}

/**
 * Robust translator helper supporting locale fallback to 'en'.
 */
export function translate(
  locale: SupportedLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] as Dictionary | undefined;
  if (dict) {
    const res = getTranslationByKey(dict, key, params);
    if (res !== key) return res;
  }

  // Fallback to English dictionary
  const fallbackDict = dictionaries.en as Dictionary;
  return getTranslationByKey(fallbackDict, key, params);
}

/**
 * Localizes dates using Intl.DateTimeFormat according to active locale.
 */
export function formatLocalizedDate(
  date: Date | string | number,
  locale: SupportedLocale = 'en',
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    gu: 'gu-IN',
    mr: 'mr-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    pa: 'pa-IN',
    bn: 'bn-IN',
  };
  return new Intl.DateTimeFormat(localeMap[locale] || 'en-IN', options).format(d);
}

/**
 * Localizes numbers using Intl.NumberFormat according to active locale.
 */
export function formatLocalizedNumber(
  num: number,
  locale: SupportedLocale = 'en',
  options?: Intl.NumberFormatOptions,
): string {
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    gu: 'gu-IN',
    mr: 'mr-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    pa: 'pa-IN',
    bn: 'bn-IN',
  };
  return new Intl.NumberFormat(localeMap[locale] || 'en-IN', options).format(num);
}

/**
 * Formats currency in INR format (₹) preserving monetary values.
 */
export function formatLocalizedCurrency(
  amount: number,
  locale: SupportedLocale = 'en',
): string {
  const formatted = formatLocalizedNumber(amount, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `₹${formatted}`;
}

/**
 * Safe helper mapping domain enum status strings to translation labels.
 */
export function getLocalizedStatusLabel(
  status: string,
  locale: SupportedLocale = 'en',
): string {
  // Check booking status first
  const bookingKey = `booking.status.${status}`;
  const bookingTranslation = translate(locale, bookingKey);
  if (bookingTranslation !== bookingKey) return bookingTranslation;

  // Check common status next
  const camelStatus = status.toLowerCase().replace(/_([a-z])/g, (_, g) => g.toUpperCase());
  const commonKey = `common.status.${camelStatus}`;
  const commonTranslation = translate(locale, commonKey);
  if (commonTranslation !== commonKey) return commonTranslation;

  return status;
}
