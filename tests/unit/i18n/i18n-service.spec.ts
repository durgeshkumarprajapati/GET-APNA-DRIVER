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

    it('contains all 10 supported target locales', () => {
      expect(SUPPORTED_LOCALES).toEqual([
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
      ]);
    });
  });

  describe('Translation Function (translate)', () => {
    it('translates keys in English correctly', () => {
      expect(translate('en', 'common.actions.save')).toBe('Save');
      expect(translate('en', 'common.actions.cancel')).toBe('Cancel');
      expect(translate('en', 'common.actions.logout')).toBe('Logout');
      expect(translate('en', 'scheduledRides.title')).toBe('Scheduled & Recurring Rides');
      expect(translate('en', 'scheduledRides.createBtn')).toBe('+ Schedule a Ride');
      expect(translate('en', 'booking.status.TRIP_IN_PROGRESS')).toBe('Service in Progress');
    });

    it('translates keys in Hindi correctly', () => {
      expect(translate('hi', 'common.actions.save')).toBe('सहेजें');
      expect(translate('hi', 'common.actions.cancel')).toBe('रद्द करें');
      expect(translate('hi', 'booking.status.TRIP_IN_PROGRESS')).toBe('सेवा जारी है');
    });

    it('translates keys in Gujarati correctly', () => {
      expect(translate('gu', 'common.actions.save')).toBe('સાચવો');
      expect(translate('gu', 'common.actions.cancel')).toBe('રદ કરો');
      expect(translate('gu', 'booking.status.TRIP_IN_PROGRESS')).toBe('સેવા ચાલુ છે');
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
      expect(getLocalizedStatusLabel('TRIP_IN_PROGRESS', 'en')).toBe('Service in Progress');
      expect(getLocalizedStatusLabel('TRIP_IN_PROGRESS', 'hi')).toBe('सेवा जारी है');
      expect(getLocalizedStatusLabel('TRIP_IN_PROGRESS', 'gu')).toBe('સેવા ચાલુ છે');
    });
  });

  describe('Regression: flat keys called by the UI without a namespace prefix', () => {
    // The scheduled-rides screens (customer + admin) and the new-booking
    // scheduler call t('scheduledRides.pauseBtn'), t('scheduledRides.oneTime'),
    // t('scheduledRides.frequency.daily'), etc. — flat/lowercase key names
    // that never matched the catalog's nested actions.*/tabs.*/uppercase
    // frequency.* structure, so translate() fell all the way through to
    // returning the raw key string. Asserts each of those exact call-site
    // keys now resolves to real text instead of echoing the key back.
    const flatKeys = [
      'scheduledRides.pauseBtn',
      'scheduledRides.resumeBtn',
      'scheduledRides.cancelBtn',
      'scheduledRides.viewDetails',
      'scheduledRides.confirmSchedule',
      'scheduledRides.oneTime',
      'scheduledRides.recurring',
      'scheduledRides.createTitle',
      'scheduledRides.adminTitle',
      'scheduledRides.confirmCancel',
      'scheduledRides.occurrenceHistory',
      'scheduledRides.failedCreate',
      'scheduledRides.frequency.daily',
      'scheduledRides.frequency.weekly',
      'scheduledRides.frequency.custom_days',
    ];

    it.each(flatKeys)('resolves %s to real text in English (not the raw key)', (key) => {
      const result = translate('en', key);
      expect(result).not.toBe(key);
      expect(result.length).toBeGreaterThan(0);
    });

    it.each(flatKeys)('resolves %s to real text in every supported locale', (key) => {
      for (const locale of SUPPORTED_LOCALES) {
        const result = translate(locale, key);
        expect(result).not.toBe(key);
      }
    });

    it("resolves common.loading (called without the '.labels.' segment)", () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(translate(locale, 'common.loading')).not.toBe('common.loading');
      }
      expect(translate('en', 'common.loading')).toBe('Loading...');
    });
  });
});
