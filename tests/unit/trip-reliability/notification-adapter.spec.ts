jest.mock('@/modules/notification/application/notification-service', () => ({
  createNotification: jest.fn(),
}));

import { NotificationAdapter } from '@/modules/trip-reliability/adapters/notification-adapter';
import { createNotification } from '@/modules/notification/application/notification-service';
import { NotificationType } from '@prisma/client';

describe('NotificationAdapter', () => {
  const mockCreateNotification = createNotification as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes through the shared createNotification instead of writing the Notification row directly, so the recipient's category preference and Web Push are respected", async () => {
    mockCreateNotification.mockResolvedValue({ id: 'notif-1' });
    const adapter = new NotificationAdapter();

    const result = await adapter.sendReliabilityNotification({
      userId: 'user-1',
      title: 'Finding Your Driver',
      message: 'Your driver is no longer available.',
      category: 'TRIP',
      metadata: { bookingId: 'bk-1', incidentType: 'DRIVER_CANCELLED' },
    });

    expect(result).toBe(true);
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'user-1',
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Finding Your Driver',
      body: 'Your driver is no longer available.',
      category: 'TRIP',
      data: { bookingId: 'bk-1', incidentType: 'DRIVER_CANCELLED' },
    });
  });

  it('returns false (never throws) when createNotification fails, so a reliability-alert failure never crashes the caller', async () => {
    mockCreateNotification.mockRejectedValue(new Error('db down'));
    const adapter = new NotificationAdapter();

    const result = await adapter.sendReliabilityNotification({
      userId: 'user-1',
      title: 'Safety Alert Priority',
      message: 'Our 24/7 Safety Command Center has received an alert for your trip.',
      category: 'SAFETY',
    });

    expect(result).toBe(false);
  });
});
