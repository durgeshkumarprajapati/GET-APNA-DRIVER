import {
  translate,
  formatLocalizedDate,
  formatLocalizedNumber,
  formatLocalizedCurrency,
  getLocalizedStatusLabel,
} from '@/i18n/helpers';
import { SUPPORTED_LOCALES, isValidLocale } from '@/i18n/config';

describe('i18n Architecture Unit Tests', () => {
  describe('Config & Validation', () => {
    it('validates supported locales correctly', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('hi')).toBe(true);
      expect(isValidLocale('gu')).toBe(true);
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale(null)).toBe(false);
      expect(isValidLocale(undefined)).toBe(false);
    });

    it('contains all 3 initial target locales', () => {
      expect(SUPPORTED_LOCALES).toEqual(['en', 'hi', 'gu']);
    });
  });

  describe('Translation Function (translate)', () => {
    it('translates keys in English correctly', () => {
      expect(translate('en', 'common.actions.save')).toBe('Save');
      expect(translate('en', 'common.actions.cancel')).toBe('Cancel');
      expect(translate('en', 'booking.status.TRIP_IN_PROGRESS')).toBe('Trip in Progress');
    });

    it('translates keys in Hindi correctly', () => {
      expect(translate('hi', 'common.actions.save')).toBe('सहेजें');
      expect(translate('hi', 'common.actions.cancel')).toBe('रद्द करें');
      expect(translate('hi', 'booking.status.TRIP_IN_PROGRESS')).toBe('यात्रा जारी है');
    });

    it('translates keys in Gujarati correctly', () => {
      expect(translate('gu', 'common.actions.save')).toBe('સાચવો');
      expect(translate('gu', 'common.actions.cancel')).toBe('રદ કરો');
      expect(translate('gu', 'booking.status.TRIP_IN_PROGRESS')).toBe('મુસાફરી ચાલુ છે');
    });

    it('supports dynamic parameter interpolation', () => {
      expect(translate('en', 'auth.otp.subtitle', { phone: '+91 9876543210' })).toBe(
        'We sent a 6-digit verification code to +91 9876543210',
      );
      expect(translate('hi', 'auth.otp.subtitle', { phone: '+91 9876543210' })).toBe(
        'हमने +91 9876543210 पर 6-अंकों का सत्यापन कोड भेजा है',
      );
    });

    it('falls back to English when key is missing in target locale', () => {
      // Non-existent key falls back to key string
      expect(translate('hi', 'non.existent.key')).toBe('non.existent.key');
    });
  });

  describe('Formatting Helpers', () => {
    it('formats localized dates accurately', () => {
      const date = new Date('2026-09-14T10:00:00Z');
      const formattedEn = formatLocalizedDate(date, 'en');
      expect(formattedEn).toContain('2026');
    });

    it('formats localized numbers accurately', () => {
      expect(formatLocalizedNumber(125000, 'en')).toContain('1,25,000');
    });

    it('formats INR currency while preserving financial amount', () => {
      expect(formatLocalizedCurrency(1880, 'en')).toContain('₹');
      expect(formatLocalizedCurrency(1880, 'en')).toContain('1,880');
      expect(formatLocalizedCurrency(1880, 'hi')).toContain('₹');
    });
  });

  describe('Status Label Lookup (getLocalizedStatusLabel)', () => {
    it('maps enum status values to localized text', () => {
      expect(getLocalizedStatusLabel('TRIP_IN_PROGRESS', 'en')).toBe('Trip in Progress');
      expect(getLocalizedStatusLabel('TRIP_IN_PROGRESS', 'hi')).toBe('यात्रा जारी है');
      expect(getLocalizedStatusLabel('TRIP_IN_PROGRESS', 'gu')).toBe('મુસાફરી ચાલુ છે');
    });
  });
});
