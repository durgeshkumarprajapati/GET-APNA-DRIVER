import {
  createNotification,
  listUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/modules/notification/application/notification-service';
import { getTemplateForNotificationType } from '@/modules/notification/application/notification-template-registry';
import { registerPushSubscription } from '@/modules/notification/application/push-notification-service';
import {
  updateUserNotificationPreference,
  isChannelEnabledForCategory,
} from '@/modules/notification/application/notification-preference-service';
import { NotificationType, NotificationStatus, NotificationPriority } from '@prisma/client';

describe('Phase 40 Notification & Engagement Center Service Unit Tests', () => {
  let mockDb: Record<string, Record<string, jest.Mock>>;

  beforeEach(() => {
    mockDb = {
      notification: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      notificationDelivery: {
        create: jest.fn().mockResolvedValue({ id: 'del-1' }),
        update: jest.fn(),
      },
      pushSubscription: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      notificationPreference: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
  });

  describe('Notification Template Registry', () => {
    it('returns valid metadata template for REFERRAL_REWARDED', () => {
      const template = getTemplateForNotificationType(NotificationType.REFERRAL_REWARDED);
      expect(template.category).toBe('REFERRAL');
      expect(template.priority).toBe(NotificationPriority.HIGH);
      expect(template.defaultActionUrl).toBe('/customer/referral');
      expect(template.imageAsset).toBe('/GiftBox.png');
    });

    it('returns valid metadata template for SCRATCH_CARD_AVAILABLE', () => {
      const template = getTemplateForNotificationType(NotificationType.SCRATCH_CARD_AVAILABLE);
      expect(template.category).toBe('SCRATCH');
      expect(template.priority).toBe(NotificationPriority.HIGH);
      expect(template.imageAsset).toBe('/scratchCard.png');
    });

    it('returns fallback template for unknown notification type', () => {
      const template = getTemplateForNotificationType('NON_EXISTENT_TYPE' as NotificationType);
      expect(template.category).toBe('SYSTEM');
      expect(template.iconName).toBe('notifications');
    });
  });

  describe('createNotification & Idempotency', () => {
    it('creates a new notification with template metadata defaults', async () => {
      mockDb.notification.findUnique.mockResolvedValue(null);
      mockDb.notification.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'notif-100',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const notif = await createNotification(
        {
          userId: 'user-1',
          type: NotificationType.REFERRAL_REWARDED,
          title: 'Referral Bonus Credited!',
          body: 'You received ₹200 referral reward.',
          idempotencyKey: 'event-100-referral-rewarded',
        },
        mockDb as never,
      );

      expect(notif.id).toBe('notif-100');
      expect(notif.category).toBe('REFERRAL');
      expect(notif.actionUrl).toBe('/customer/referral');
      expect(notif.imageAsset).toBe('/GiftBox.png');
      expect(mockDb.notification.create).toHaveBeenCalled();
    });

    it('returns existing notification on idempotency key match without creating duplicate', async () => {
      const existingNotif = {
        id: 'notif-existing',
        userId: 'user-1',
        type: NotificationType.BOOKING_CREATED,
        title: 'Existing',
        body: 'Body',
        idempotencyKey: 'dup-key-1',
      };
      mockDb.notification.findUnique.mockResolvedValue(existingNotif);

      const result = await createNotification(
        {
          userId: 'user-1',
          type: NotificationType.BOOKING_CREATED,
          title: 'Duplicate Title',
          body: 'Duplicate Body',
          idempotencyKey: 'dup-key-1',
        },
        mockDb as never,
      );

      expect(result.id).toBe('notif-existing');
      expect(mockDb.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('listUserNotifications & Filtering', () => {
    it('filters notifications by userId, category, and status', async () => {
      mockDb.notification.findMany.mockResolvedValue([
        { id: 'n1', userId: 'user-1', category: 'REFERRAL', status: 'UNREAD' },
      ]);
      mockDb.notification.count.mockResolvedValue(1);

      const res = await listUserNotifications(
        {
          userId: 'user-1',
          category: 'REFERRAL',
          status: NotificationStatus.UNREAD,
          limit: 10,
          offset: 0,
        },
        mockDb as never,
      );

      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
      expect(mockDb.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            category: 'REFERRAL',
            status: NotificationStatus.UNREAD,
          }),
        }),
      );
    });
  });

  describe('Read Status & IDOR Security', () => {
    it('marks unread notification as read when owned by authenticated user', async () => {
      mockDb.notification.findUnique.mockResolvedValue({
        id: 'n-1',
        userId: 'user-1',
        status: NotificationStatus.UNREAD,
      });
      mockDb.notification.update.mockResolvedValue({
        id: 'n-1',
        userId: 'user-1',
        status: NotificationStatus.READ,
        readAt: new Date(),
      });

      const updated = await markNotificationAsRead('user-1', 'n-1', mockDb as never);
      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('READ');
    });

    it('rejects marking notification as read if owned by another user (IDOR prevention)', async () => {
      mockDb.notification.findUnique.mockResolvedValue({
        id: 'n-other',
        userId: 'user-victim',
        status: NotificationStatus.UNREAD,
      });

      const result = await markNotificationAsRead('user-attacker', 'n-other', mockDb as never);
      expect(result).toBeNull();
      expect(mockDb.notification.update).not.toHaveBeenCalled();
    });

    it('marks all unread notifications as read for authenticated user', async () => {
      mockDb.notification.updateMany.mockResolvedValue({ count: 5 });

      const count = await markAllNotificationsAsRead('user-1', mockDb as never);
      expect(count).toBe(5);
      expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: NotificationStatus.UNREAD },
        data: expect.objectContaining({ status: NotificationStatus.READ }),
      });
    });
  });

  describe('Push Subscriptions & Preferences', () => {
    it('upserts Web Push subscription', async () => {
      mockDb.pushSubscription.upsert.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://push.example.com/endpoint',
        isActive: true,
      });

      const sub = await registerPushSubscription(
        'user-1',
        {
          endpoint: 'https://push.example.com/endpoint',
          keys: { p256dh: 'p256-key', auth: 'auth-key' },
        },
        mockDb as never,
      );

      expect(sub.id).toBe('sub-1');
      expect(mockDb.pushSubscription.upsert).toHaveBeenCalled();
    });

    it('enforces SAFETY category preference as non-disableable', async () => {
      mockDb.notificationPreference.upsert.mockImplementation(
        (args: { create: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'pref-safety',
            ...args.create,
          }),
      );

      const pref = await updateUserNotificationPreference(
        'user-1',
        { category: 'SAFETY', push: false, email: false },
        mockDb as never,
      );

      expect(pref.push).toBe(true);
      expect(pref.email).toBe(true);

      const isEnabled = await isChannelEnabledForCategory(
        'user-1',
        'SAFETY',
        'push',
        mockDb as never,
      );
      expect(isEnabled).toBe(true);
    });
  });
});
