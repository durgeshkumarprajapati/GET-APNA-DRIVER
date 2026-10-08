/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'GET APNA DRIVER | Elite Verified Chauffeur Network',
  description:
    'Book background-verified executive chauffeurs for your personal car on demand, hourly, or outstation. Rated 4.9/5 across 185,000+ completed journeys.',
};

import { cookies } from 'next/headers';
import { I18nProvider } from '@/i18n/context';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider, THEME_COOKIE_NAME, ThemeMode } from '@/components/theme-provider';
import { LOCALE_COOKIE_NAME, isValidLocale, DEFAULT_LOCALE, SupportedLocale } from '@/i18n/config';

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const initialLocale: SupportedLocale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const rawTheme = cookieStore.get(THEME_COOKIE_NAME)?.value as ThemeMode | undefined;
  const initialTheme: ThemeMode = rawTheme && ['LIGHT', 'DARK', 'SYSTEM'].includes(rawTheme) ? rawTheme : 'LIGHT';
  const htmlThemeClass = initialTheme === 'DARK' ? 'dark' : 'light';

  return (
    <html lang={initialLocale} className={htmlThemeClass} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gad_theme_preference');if(t==='DARK'){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');}else if(t==='LIGHT'){document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');}else if(t==='SYSTEM'){if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');}else{document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');}}else{document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-background text-on-surface font-body-md antialiased min-h-screen">
        <ThemeProvider initialTheme={initialTheme}>
          <I18nProvider initialLocale={initialLocale}>
            <ToastProvider>{children}</ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
