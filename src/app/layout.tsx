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
import { LOCALE_COOKIE_NAME, isValidLocale, DEFAULT_LOCALE, SupportedLocale } from '@/i18n/config';

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const initialLocale: SupportedLocale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return (
    <html lang={initialLocale} className="dark">
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
      </head>
      <body className="bg-surface text-on-surface font-body-md antialiased min-h-screen">
        <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
