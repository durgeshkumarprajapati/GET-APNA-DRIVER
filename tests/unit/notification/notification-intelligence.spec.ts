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
      const mockDb: any = {
        notification: {
          count: jest.fn().mockResolvedValue(10),
        },
      };

      const capConfig = { frequencyCapEnabled: true, maxNonUrgentPerDay: 3 };
      const isExceeded = await isFrequencyCapExceeded('user-1', 'PROMOTION', 'HIGH', capConfig, mockDb);

      expect(isExceeded).toBe(false);
      expect(mockDb.notification.count).not.toHaveBeenCalled();
    });

    it('detects when frequency cap threshold is reached for non-urgent notifications', async () => {
      const mockDb: any = {
        notification: {
          count: jest.fn().mockResolvedValue(4),
        },
      };

      const capConfig = { frequencyCapEnabled: true, maxNonUrgentPerDay: 3 };
      const isExceeded = await isFrequencyCapExceeded('user-1', 'PROMOTION', 'NORMAL', capConfig, mockDb);

      expect(isExceeded).toBe(true);
      expect(mockDb.notification.count).toHaveBeenCalled();
    });
  });

  describe('Notification Intelligence Service', () => {
    it('detects duplicate idempotency keys', async () => {
      const mockDb: any = {
        notification: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing-notif-id' }),
        },
        customerPreference: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        notificationPreference: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };

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
    });
  });

  describe('Notification Reminder & Delivery Retry Services', () => {
    it('generateBookingAndScheduleReminders executes without crashing', async () => {
      const mockDb: any = {
        scheduledRide: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        booking: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };

      const result = await generateBookingAndScheduleReminders(mockDb);
      expect(result.remindersCreated).toBe(0);
      expect(result.skippedDuplicates).toBe(0);
    });

    it('processNotificationDeliveryRetries processes pending deliveries', async () => {
      const mockDb: any = {
        notificationDelivery: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };

      const result = await processNotificationDeliveryRetries(mockDb);
      expect(result.processedCount).toBe(0);
    });
  });
});
