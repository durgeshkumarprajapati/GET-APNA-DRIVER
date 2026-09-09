import webpush from 'web-push';
import { VapidPushDeliveryProvider } from '@/modules/notification/infrastructure/push-provider';
import { isChannelEnabledForCategory } from '@/modules/notification/application/notification-preference-service';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

describe('VapidPushDeliveryProvider & Safety Preference Override', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('VapidPushDeliveryProvider', () => {
    it('should configure web-push VAPID details when keys are available', () => {
      process.env.VAPID_PUBLIC_KEY = 'test_public_key';
      process.env.VAPID_PRIVATE_KEY = 'test_private_key';
      process.env.VAPID_SUBJECT = 'mailto:test@example.com';

      const provider = new VapidPushDeliveryProvider();
      expect(provider).toBeDefined();

      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:test@example.com',
        'test_public_key',
        'test_private_key',
      );
    });

    it('should dispatch web-push payload and return success result', async () => {
      (webpush.sendNotification as jest.Mock).mockResolvedValue({ statusCode: 201 });

      const provider = new VapidPushDeliveryProvider();
      const res = await provider.sendPush(
        'https://fcm.googleapis.com/fcm/send/test-token',
        'p256dh_key',
        'auth_key',
        { title: 'Emergency SOS', body: 'Support on the way' },
      );

      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(201);
      expect(webpush.sendNotification).toHaveBeenCalled();
    });

    it('should handle HTTP 410 or 404 expired push subscription gracefully', async () => {
      const error = new Error('Subscription expired') as Error & { statusCode?: number };
      error.statusCode = 410;
      (webpush.sendNotification as jest.Mock).mockRejectedValue(error);

      const provider = new VapidPushDeliveryProvider();
      const res = await provider.sendPush(
        'https://fcm.googleapis.com/fcm/send/expired-token',
        'p256dh_key',
        'auth_key',
        { title: 'Emergency SOS', body: 'Support on the way' },
      );

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(410);
      expect(res.isExpired).toBe(true);
    });
  });

  describe('Safety Category Preference Mandatory Override', () => {
    it('should always return true for SAFETY category notifications regardless of muted preferences', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockDb: any = {
        notificationPreference: {
          findUnique: jest.fn().mockResolvedValue({
            userId: 'usr-1',
            category: 'SAFETY',
            push: false,
            email: false,
            sms: false,
          }),
        },
      };

      const pushEnabled = await isChannelEnabledForCategory('usr-1', 'SAFETY', 'push', mockDb);
      const emailEnabled = await isChannelEnabledForCategory('usr-1', 'SAFETY', 'email', mockDb);
      const smsEnabled = await isChannelEnabledForCategory('usr-1', 'SAFETY', 'sms', mockDb);

      expect(pushEnabled).toBe(true);
      expect(emailEnabled).toBe(true);
      expect(smsEnabled).toBe(true);
    });
  });
});
