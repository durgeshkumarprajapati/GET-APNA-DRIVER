'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { DEFAULT_LOCALE, isValidLocale, LOCALE_COOKIE_NAME, SupportedLocale } from './config';
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedNumber,
  getLocalizedStatusLabel,
  translate,
} from './helpers';

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (newLocale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number) => string;
  statusLabel: (status: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function getCookieLocale(): SupportedLocale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`));
  const val = match ? decodeURIComponent(match[1]) : null;
  return isValidLocale(val) ? val : null;
}

function setCookieLocale(locale: SupportedLocale) {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=31536000; SameSite=Lax`;
}

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}

export function I18nProvider({ children, initialLocale = DEFAULT_LOCALE }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const fromCookie = getCookieLocale();
    return fromCookie || initialLocale;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    if (!isValidLocale(newLocale)) return;
    setLocaleState(newLocale);
    setCookieLocale(newLocale);

    // Sync with DB if user is logged in
    void fetch('/api/auth/locale', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    }).catch(() => {
      // Ignore background sync errors
    });
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(locale, key, params);
    },
    [locale],
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      return formatLocalizedDate(date, locale, options);
    },
    [locale],
  );

  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions) => {
      return formatLocalizedNumber(num, locale, options);
    },
    [locale],
  );

  const formatCurrency = useCallback(
    (amount: number) => {
      return formatLocalizedCurrency(amount, locale);
    },
    [locale],
  );

  const statusLabel = useCallback(
    (status: string) => {
      return getLocalizedStatusLabel(status, locale);
    },
    [locale],
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        formatDate,
        formatNumber,
        formatCurrency,
        statusLabel,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback if component is rendered outside provider
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: string, params?: Record<string, string | number>) => translate(DEFAULT_LOCALE, key, params),
      formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
        formatLocalizedDate(date, DEFAULT_LOCALE, options),
      formatNumber: (num: number, options?: Intl.NumberFormatOptions) =>
        formatLocalizedNumber(num, DEFAULT_LOCALE, options),
      formatCurrency: (amount: number) => formatLocalizedCurrency(amount, DEFAULT_LOCALE),
      statusLabel: (status: string) => getLocalizedStatusLabel(status, DEFAULT_LOCALE),
    };
  }
  return context;
}
