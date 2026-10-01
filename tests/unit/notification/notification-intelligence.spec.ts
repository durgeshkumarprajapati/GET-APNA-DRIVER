import type { Db } from '@/shared/database/prisma';
import { isInQuietHours, shouldSuppressForQuietHours } from '@/modules/notification/application/quiet-hours-evaluator';
import { isFrequencyCapExceeded } from '@/modules/notification/application/frequency-cap-evaluator';
import { evaluateNotificationIntelligence } from '@/modules/notification/application/notification-intelligence-service';
import { generateBookingAndScheduleReminders } from '@/modules/notification/application/notification-reminder-service';
import { processNotificationDeliveryRetries } from '@/modules/notification/application/notification-delivery-retry-service';

describe('Phase 90 — Customer Engagement & Notification Intelligence', () => {
  describe('Quiet Hours Evaluator', () => {
    const overnightConfig = {
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      timezone: 'Asia/Kolkata',
    };

    it('identifies time inside overnight quiet hours window (e.g. 11:30 PM)', () => {
      const lateNight = new Date('2026-10-01T23:30:00');
      expect(isInQuietHours(lateNight, overnightConfig)).toBe(true);
    });

    it('identifies time outside quiet hours window (e.g. 2:00 PM)', () => {
      const afternoon = new Date('2026-10-01T14:00:00');
      expect(isInQuietHours(afternoon, overnightConfig)).toBe(false);
    });

    it("evaluates in the configured timezone, not the server process's own — a UTC server must not shift the window", () => {
      // 23:00 IST = 17:30 UTC. Using an explicit 'Z' suffix means this Date
      // is unambiguous regardless of which timezone the test runner itself
      // is in — if isInQuietHours used currentTime.getHours() (server-local)
      // instead of config.timezone, this would come out false on a UTC (or
      // any non-IST) host.
      const nightInUtc = new Date('2026-10-01T17:30:00Z'); // 23:00 IST
      expect(isInQuietHours(nightInUtc, overnightConfig)).toBe(true);

      // 10:00 IST = 04:30 UTC — well outside 22:00-07:00 IST.
      const morningInUtc = new Date('2026-10-01T04:30:00Z'); // 10:00 IST
      expect(isInQuietHours(morningInUtc, overnightConfig)).toBe(false);
    });

    it('suppresses PROMOTION during quiet hours', () => {
      const lateNight = new Date('2026-10-01T23:30:00');
      const shouldSuppress = shouldSuppressForQuietHours('PROMOTION', 'NORMAL', lateNight, overnightConfig);
      expect(shouldSuppress).toBe(true);
    });

    it('allows HIGH priority or SAFETY notifications during quiet hours', () => {
      const lateNight = new Date('2026-10-01T23:30:00');
      const shouldSuppressSafety = shouldSuppressForQuietHours('SAFETY', 'NORMAL', lateNight, overnightConfig);
      const shouldSuppressHigh = shouldSuppressForQuietHours('PROMOTION', 'HIGH', lateNight, overnightConfig);

      expect(shouldSuppressSafety).toBe(false);
      expect(shouldSuppressHigh).toBe(false);
    });
  });

  describe('Frequency Cap Evaluator', () => {
    it('bypasses frequency capping for urgent/high priority notifications', async () => {
      const mockDb = {
        notification: {
          count: jest.fn().mockResolvedValue(10),
        },
      } as unknown as Db;

      const capConfig = { frequencyCapEnabled: true, maxNonUrgentPerDay: 3 };
      const isExceeded = await isFrequencyCapExceeded('user-1', 'PROMOTION', 'HIGH', capConfig, mockDb);

      expect(isExceeded).toBe(false);
      expect((mockDb as unknown as { notification: { count: jest.Mock } }).notification.count).not.toHaveBeenCalled();
    });

    it('detects when frequency cap threshold is reached for non-urgent notifications', async () => {
      const mockCount = jest.fn().mockResolvedValue(4);
      const mockDb = { notification: { count: mockCount } } as unknown as Db;

      const capConfig = { frequencyCapEnabled: true, maxNonUrgentPerDay: 3 };
      const isExceeded = await isFrequencyCapExceeded('user-1', 'PROMOTION', 'NORMAL', capConfig, mockDb);

      expect(isExceeded).toBe(true);
      expect(mockCount).toHaveBeenCalled();
    });

    it('only counts rows that were actually delivered and excludes HIGH/URGENT priority from the query, so a suppressed or bypassed row can never keep the cap permanently exceeded', async () => {
      const mockCount = jest.fn().mockResolvedValue(0);
      const mockDb = { notification: { count: mockCount } } as unknown as Db;

      const capConfig = { frequencyCapEnabled: true, maxNonUrgentPerDay: 3 };
      await isFrequencyCapExceeded('user-1', 'PROMOTION', 'NORMAL', capConfig, mockDb);

      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: { notIn: ['HIGH', 'URGENT'] },
            deliveries: { some: { channel: 'IN_APP', status: 'DELIVERED' } },
          }),
        }),
      );
    });
  });

  describe('Notification Intelligence Service', () => {
    it('detects duplicate idempotency keys and returns the already-found row for reuse', async () => {
      const existing = { id: 'existing-notif-id' };
      const mockDb = {
        notification: {
          findUnique: jest.fn().mockResolvedValue(existing),
        },
        customerPreference: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        notificationPreference: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as unknown as Db;

      const result = await evaluateNotificationIntelligence(
        {
          userId: 'user-1',
          category: 'PROMOTION',
          idempotencyKey: 'promo-key-101',
        },
        mockDb,
      );

      expect(result.allowed).toBe(false);
      expect(result.suppressedReason).toBe('DUPLICATE_IDEMPOTENCY');
      expect(result.existingNotification).toBe(existing);
    });

    it("reads quiet-hours/frequency-cap settings straight off the real CustomerPreference columns — these must not be a no-op after a customer saves them", async () => {
      const mockDb = {
        notification: {
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(0),
        },
        customerPreference: {
          findUnique: jest.fn().mockResolvedValue({
            quietHoursEnabled: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00',
            notificationTimezone: 'Asia/Kolkata',
            frequencyCapEnabled: true,
            maxNonUrgentPerDay: 1,
          }),
        },
        notificationPreference: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as unknown as Db;

      // Quiet hours disabled by the customer — a PROMOTION at 2am must go
      // through rather than falling back to the always-on default.
      const result = await evaluateNotificationIntelligence(
        {
          userId: 'user-1',
          category: 'PROMOTION',
          priority: 'NORMAL',
          currentTime: new Date('2026-10-01T02:00:00Z'),
        },
        mockDb,
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Notification Reminder & Delivery Retry Services', () => {
    it('generateBookingAndScheduleReminders filters scheduled rides by nextOccurrenceAt in the query, not scheduledDate/startAt', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockDb = {
        scheduledRide: {
          findMany: mockFindMany,
        },
      } as unknown as Db;

      const result = await generateBookingAndScheduleReminders(mockDb);

      expect(result.remindersCreated).toBe(0);
      expect(result.skippedDuplicates).toBe(0);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            nextOccurrenceAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('processNotificationDeliveryRetries processes pending deliveries', async () => {
      const mockDb = {
        notificationDelivery: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as unknown as Db;

      const result = await processNotificationDeliveryRetries(mockDb);
      expect(result.processedCount).toBe(0);
    });
  });
});
