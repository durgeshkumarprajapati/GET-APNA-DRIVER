'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
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

function setCookieLocale(locale: SupportedLocale) {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=31536000; SameSite=Lax`;
}

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}

export function I18nProvider({ children, initialLocale = DEFAULT_LOCALE }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);
  const [prevInitialLocale, setPrevInitialLocale] = useState<SupportedLocale>(initialLocale);

  if (prevInitialLocale !== initialLocale) {
    setPrevInitialLocale(initialLocale);
    setLocaleState(initialLocale);
  }

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Rapidly switching en -> hi -> gu -> en fires one DB-sync POST per click;
  // without cancellation, out-of-order network responses could let an
  // earlier click's write land in the DB after a later click's, leaving
  // User.preferredLocale out of sync with what the user actually last
  // selected (client state/cookie are unaffected either way — they're set
  // synchronously below, in click order). Aborting the previous in-flight
  // request whenever a new one fires guarantees only the latest selection
  // is ever the one that completes.
  const pendingLocaleSyncRef = useRef<AbortController | null>(null);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    if (!isValidLocale(newLocale)) return;
    setLocaleState(newLocale);
    setCookieLocale(newLocale);

    pendingLocaleSyncRef.current?.abort();
    const controller = new AbortController();
    pendingLocaleSyncRef.current = controller;

    // Sync with DB if user is logged in
    void fetch('/api/auth/locale', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
      signal: controller.signal,
    }).catch(() => {
      // Ignore background sync errors (including intentional aborts)
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
      t: (key: string, params?: Record<string, string | number>) =>
        translate(DEFAULT_LOCALE, key, params),
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
