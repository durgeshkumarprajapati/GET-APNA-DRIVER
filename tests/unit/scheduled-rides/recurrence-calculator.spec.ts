import {
  calculateNextOccurrence,
  getIsoDayOfWeek,
} from '@/modules/scheduled-rides/domain/recurrence-calculator';
import { ScheduleType, RecurrenceFrequency } from '@prisma/client';
import { InvalidRecurrenceConfigurationError } from '@/modules/scheduled-rides/domain/errors';

describe('RecurrenceCalculator Domain Unit Tests', () => {
  describe('getIsoDayOfWeek', () => {
    it('correctly maps Sunday to 7 and Monday to 1', () => {
      // 2026-09-14 is Monday
      const monday = new Date(2026, 8, 14, 10, 0, 0);
      expect(getIsoDayOfWeek(monday)).toBe(1);

      // 2026-09-20 is Sunday
      const sunday = new Date(2026, 8, 20, 10, 0, 0);
      expect(getIsoDayOfWeek(sunday)).toBe(7);
    });
  });

  describe('calculateNextOccurrence', () => {
    it('throws error for invalid scheduledTime format', () => {
      expect(() =>
        calculateNextOccurrence({
          scheduleType: ScheduleType.ONE_TIME,
          scheduledTime: '25:99',
        }),
      ).toThrow(InvalidRecurrenceConfigurationError);
    });

    it('calculates ONE_TIME scheduled occurrence in future', () => {
      const scheduledDate = new Date(2026, 8, 15, 0, 0, 0);
      const fromTime = new Date(2026, 8, 14, 8, 0, 0);

      const next = calculateNextOccurrence({
        scheduleType: ScheduleType.ONE_TIME,
        scheduledTime: '09:30',
        scheduledDate,
        fromTime,
      });

      expect(next).not.toBeNull();
      expect(next?.getHours()).toBe(9);
      expect(next?.getMinutes()).toBe(30);
      expect(next?.getDate()).toBe(15);
    });

    it('returns null for past ONE_TIME scheduled ride', () => {
      const scheduledDate = new Date(2026, 8, 10, 0, 0, 0);
      const fromTime = new Date(2026, 8, 14, 10, 0, 0);

      const next = calculateNextOccurrence({
        scheduleType: ScheduleType.ONE_TIME,
        scheduledTime: '09:30',
        scheduledDate,
        fromTime,
      });

      expect(next).toBeNull();
    });

    it('calculates next DAILY recurring occurrence', () => {
      const fromTime = new Date(2026, 8, 14, 8, 0, 0); // 8:00 AM local

      const next = calculateNextOccurrence({
        scheduleType: ScheduleType.RECURRING,
        recurrenceFrequency: RecurrenceFrequency.DAILY,
        scheduledTime: '11:00', // Later today at 11:00 AM
        fromTime,
      });

      expect(next).not.toBeNull();
      expect(next?.getDate()).toBe(14);
      expect(next?.getHours()).toBe(11);

      // If scheduled time has already passed today (e.g. 07:00 AM vs fromTime 8:00 AM), it should roll to tomorrow
      const nextTomorrow = calculateNextOccurrence({
        scheduleType: ScheduleType.RECURRING,
        recurrenceFrequency: RecurrenceFrequency.DAILY,
        scheduledTime: '07:00',
        fromTime,
      });

      expect(nextTomorrow).not.toBeNull();
      expect(nextTomorrow?.getDate()).toBe(15);
      expect(nextTomorrow?.getHours()).toBe(7);
    });

    it('calculates WEEKLY recurrence on specified days of week', () => {
      // 2026-09-14 is Monday (1)
      const fromTime = new Date(2026, 8, 14, 8, 0, 0);

      // Schedule for Wednesday (3) and Friday (5)
      const next = calculateNextOccurrence({
        scheduleType: ScheduleType.RECURRING,
        recurrenceFrequency: RecurrenceFrequency.CUSTOM_DAYS,
        daysOfWeek: [3, 5],
        scheduledTime: '09:00',
        fromTime,
      });

      expect(next).not.toBeNull();
      // Should match Wednesday (Sept 16)
      expect(next?.getDate()).toBe(16);
      expect(getIsoDayOfWeek(next!)).toBe(3);
    });

    it('returns null if endAt date is exceeded', () => {
      const fromTime = new Date(2026, 8, 14, 12, 0, 0);
      const endAt = new Date(2026, 8, 15, 0, 0, 0);

      const next = calculateNextOccurrence({
        scheduleType: ScheduleType.RECURRING,
        recurrenceFrequency: RecurrenceFrequency.DAILY,
        scheduledTime: '10:00',
        endAt,
        fromTime,
      });

      expect(next).toBeNull();
    });
  });
});
