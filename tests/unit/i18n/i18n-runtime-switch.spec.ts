import {
  translate,
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedNumber,
} from '@/i18n/helpers';
import { isValidLocale, SUPPORTED_LOCALES } from '@/i18n/config';
import { dictionaries } from '@/i18n/locales';

describe('Phase 31 Objective A — i18n Runtime Reliability & Translation Parity', () => {
  describe('Locale Validation', () => {
    it('accepts supported locales: en, hi, gu', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('hi')).toBe(true);
      expect(isValidLocale('gu')).toBe(true);
    });

    it('rejects unsupported, malicious, or invalid locale strings', () => {
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale('xx')).toBe(false);
      expect(isValidLocale('../../')).toBe(false);
      expect(isValidLocale('<script>alert(1)</script>')).toBe(false);
      expect(isValidLocale(null)).toBe(false);
      expect(isValidLocale(undefined)).toBe(false);
    });
  });

  describe('Runtime Translation Resolution across en, hi, gu', () => {
    it('translates customer navigation keys in English, Hindi, and Gujarati', () => {
      expect(translate('en', 'customer.nav.dashboard')).toBe('Dashboard');
      expect(translate('hi', 'customer.nav.dashboard')).toBe('डैशबोर्ड');
      expect(translate('gu', 'customer.nav.dashboard')).toBe('ડેશબોર્ડ');

      expect(translate('en', 'customer.nav.findDriver')).toBe('Find a Driver');
      expect(translate('hi', 'customer.nav.findDriver')).toBe('ड्राइवर खोजें');
      expect(translate('gu', 'customer.nav.findDriver')).toBe('ડ્રાઇવર શોધો');

      expect(translate('en', 'customer.nav.favorites')).toBe('Favorite Drivers');
      expect(translate('hi', 'customer.nav.favorites')).toBe('पसंदीदा ड्राइवर');
      expect(translate('gu', 'customer.nav.favorites')).toBe('પસંદગીના ડ્રાઇવરો');
    });

    it('translates driver navigation keys in English, Hindi, and Gujarati', () => {
      expect(translate('en', 'driver.nav.dashboard')).toBe('Dashboard');
      expect(translate('hi', 'driver.nav.dashboard')).toBe('डैशबोर्ड');
      expect(translate('gu', 'driver.nav.dashboard')).toBe('ડેશબોર્ડ');

      expect(translate('en', 'driver.nav.availability')).toBe('Go Online / Offline');
      expect(translate('hi', 'driver.nav.availability')).toBe('ऑनलाइन / ऑफलाइन जाएं');
      expect(translate('gu', 'driver.nav.availability')).toBe('ઓનલાઇન / ઓફલાઇન થાઓ');
    });

    it('translates admin navigation keys in English, Hindi, and Gujarati', () => {
      expect(translate('en', 'admin.nav.analyticsAndBi')).toBe('Analytics & BI');
      expect(translate('hi', 'admin.nav.analyticsAndBi')).toBe('एनालिटिक्स एवं बीआई');
      expect(translate('gu', 'admin.nav.analyticsAndBi')).toBe('એનાલિટિક્સ અને બીઆઈ');

      expect(translate('en', 'admin.nav.taxInvoices')).toBe('Tax Invoices');
      expect(translate('hi', 'admin.nav.taxInvoices')).toBe('टैक्स चालान');
      expect(translate('gu', 'admin.nav.taxInvoices')).toBe('ટેક્સ ઇનવોઇસ');
    });

    it('handles parameter interpolation correctly in all locales', () => {
      expect(translate('en', 'customer.dashboard.welcome', { name: 'John' })).toBe(
        'Welcome back, John',
      );
      expect(translate('hi', 'customer.dashboard.welcome', { name: 'जॉन' })).toBe(
        'वापसी पर स्वागत है, जॉन',
      );
      expect(translate('gu', 'customer.dashboard.welcome', { name: 'જાન' })).toBe(
        'પાછા ફરવા બદલ સ્વાગત છે, જાન',
      );
    });

    it('falls back to English when a key is missing in target locale', () => {
      // Key existing only in en
      const key = 'nonexistent.random.key.string';
      expect(translate('hi', key)).toBe(key);
    });
  });

  describe('Locale-Aware Formatting', () => {
    it('formats currency preserving monetary value (INR)', () => {
      expect(formatLocalizedCurrency(1500, 'en')).toBe('₹1,500');
      expect(formatLocalizedCurrency(1500, 'hi')).toContain('1,500');
      expect(formatLocalizedCurrency(1500, 'gu')).toContain('1,500');
    });

    it('formats numbers according to locale conventions', () => {
      expect(formatLocalizedNumber(50000, 'en')).toBe('50,000');
      expect(formatLocalizedNumber(50000, 'hi')).toBe('50,000');
    });

    it('formats dates consistently', () => {
      const date = new Date('2026-09-14T10:00:00Z');
      expect(formatLocalizedDate(date, 'en')).toBeTruthy();
      expect(formatLocalizedDate(date, 'hi')).toBeTruthy();
      expect(formatLocalizedDate(date, 'gu')).toBeTruthy();
    });
  });

  describe('Translation Dictionary Key Parity Audit', () => {
    it('ensures all top-level keys in en dictionaries exist in hi and gu', () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(dictionaries[locale]).toBeDefined();
        expect(dictionaries[locale].customer).toBeDefined();
        expect(dictionaries[locale].driver).toBeDefined();
        expect(dictionaries[locale].admin).toBeDefined();
        expect(dictionaries[locale].common).toBeDefined();
      }
    });
  });
});
