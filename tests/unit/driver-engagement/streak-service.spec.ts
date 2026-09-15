import {
  getKolkataDateString,
  getDayDifference,
} from '@/modules/driver-engagement/application/streak-service';

describe('StreakService Unit Tests', () => {
  describe('getKolkataDateString', () => {
    it('correctly calculates Asia/Kolkata business date string (YYYY-MM-DD)', () => {
      // 2026-09-14 23:45 IST corresponds to 2026-09-14 18:15 UTC
      const lateIstDate = new Date('2026-09-14T18:15:00.000Z');
      const dateStr = getKolkataDateString(lateIstDate);
      expect(dateStr).toBe('2026-09-14');
    });

    it('correctly shifts late UTC night to next IST day (e.g. 20:30 UTC = 02:00 IST next day)', () => {
      const lateUtcDate = new Date('2026-09-14T20:30:00.000Z');
      const dateStr = getKolkataDateString(lateUtcDate);
      expect(dateStr).toBe('2026-09-15');
    });
  });

  describe('getDayDifference', () => {
    it('returns 0 for identical dates', () => {
      expect(getDayDifference('2026-09-14', '2026-09-14')).toBe(0);
    });

    it('returns 1 for consecutive calendar days', () => {
      expect(getDayDifference('2026-09-14', '2026-09-15')).toBe(1);
    });

    it('returns gap count for missed days', () => {
      expect(getDayDifference('2026-09-10', '2026-09-14')).toBe(4);
    });
  });
});
