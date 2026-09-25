import {
  sendBookingMessage,
  listBookingMessages,
  markMessagesAsRead,
  createSystemBookingMessage,
  QUICK_MESSAGES,
} from '@/modules/booking/application/booking-messaging-service';
import {
  MessagingNotAuthorizedError,
  MessagingNotAllowedError,
} from '@/modules/booking/domain/errors';

describe('Phase 80 — Customer ↔ Driver Service Communication & Live Journey', () => {
  const customerId = 'cust-user-80';
  const driverUserId = 'driver-user-80';
  const driverProfileId = 'driver-profile-80';
  const unauthorizedUserId = 'hacker-user-99';
  const bookingId = 'booking-80';

  const mockBooking = {
    id: bookingId,
    customerId,
    driverProfileId,
    preferredDriverProfileId: null,
    status: 'DRIVER_EN_ROUTE',
  };

  const mockDriverProfile = {
    id: driverProfileId,
    userId: driverUserId,
  };

  const createMockDb = (overrides?: { booking?: Record<string, unknown> }) => ({
    booking: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === bookingId) return Promise.resolve(overrides?.booking ?? mockBooking);
        return Promise.resolve(null);
      }),
    },
    driverProfile: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === driverProfileId || where.userId === driverUserId) {
          return Promise.resolve(mockDriverProfile);
        }
        return Promise.resolve(null);
      }),
    },
    bookingAssignmentAttempt: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    bookingMessage: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'msg-101',
          createdAt: new Date(),
          readAt: null,
          ...data,
        }),
      ),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'msg-1',
          bookingId,
          senderUserId: customerId,
          senderRole: 'CUSTOMER',
          messageType: 'TEXT',
          body: 'I am at the pickup location.',
          readAt: null,
          createdAt: new Date('2026-09-25T10:00:00Z'),
        },
      ]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(1),
    },
    outboxEvent: {
      create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
    },
  });

  it('should allow customer to send a message to assigned driver', async () => {
    const mockDb = createMockDb();
    const dbArg = mockDb as unknown as Parameters<typeof sendBookingMessage>[4];
    const result = await sendBookingMessage(
      customerId,
      bookingId,
      'I am standing near the reception.',
      { messageType: 'TEXT' },
      dbArg,
    );

    expect(result).toBeDefined();
    expect(result.body).toBe('I am standing near the reception.');
    expect(result.senderRole).toBe('CUSTOMER');
    expect(mockDb.bookingMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId,
          senderUserId: customerId,
          senderRole: 'CUSTOMER',
          body: 'I am standing near the reception.',
        }),
      }),
    );
    expect(mockDb.outboxEvent.create).toHaveBeenCalled();
  });

  it('should allow driver to send quick reply message', async () => {
    const mockDb = createMockDb();
    const dbArg = mockDb as unknown as Parameters<typeof sendBookingMessage>[4];
    const quickReplyText = QUICK_MESSAGES.DRIVER[0].text; // "I am on my way."

    const result = await sendBookingMessage(
      driverUserId,
      bookingId,
      quickReplyText,
      { messageType: 'QUICK_REPLY' },
      dbArg,
    );

    expect(result.senderRole).toBe('DRIVER');
    expect(result.messageType).toBe('QUICK_REPLY');
    expect(result.body).toBe(quickReplyText);
  });

  it('should reject empty or whitespace-only messages', async () => {
    const mockDb = createMockDb();
    const dbArg = mockDb as unknown as Parameters<typeof sendBookingMessage>[4];
    await expect(
      sendBookingMessage(customerId, bookingId, '   ', { messageType: 'TEXT' }, dbArg),
    ).rejects.toThrow('Message body cannot be empty.');
  });

  it('should enforce IDOR protection and reject unauthorized user', async () => {
    const mockDb = createMockDb();
    const dbArg = mockDb as unknown as Parameters<typeof sendBookingMessage>[4];
    await expect(
      sendBookingMessage(
        unauthorizedUserId,
        bookingId,
        'Attempting unauthorized access',
        { messageType: 'TEXT' },
        dbArg,
      ),
    ).rejects.toThrow(MessagingNotAuthorizedError);
  });

  it('should block message sending when booking is TRIP_COMPLETED (read-only mode)', async () => {
    const mockDb = createMockDb({
      booking: { ...mockBooking, status: 'TRIP_COMPLETED' },
    });
    const dbArg = mockDb as unknown as Parameters<typeof sendBookingMessage>[4];

    await expect(
      sendBookingMessage(
        customerId,
        bookingId,
        'Can I still send?',
        { messageType: 'TEXT' },
        dbArg,
      ),
    ).rejects.toThrow(MessagingNotAllowedError);
  });

  it('should allow reading message thread in read-only mode when TRIP_COMPLETED', async () => {
    const mockDb = createMockDb({
      booking: { ...mockBooking, status: 'TRIP_COMPLETED' },
    });
    const dbArg = mockDb as unknown as Parameters<typeof sendBookingMessage>[4];

    const result = await listBookingMessages(customerId, bookingId, dbArg);
    expect(result.messages.length).toBe(1);
    expect(result.canCommunicate.allowed).toBe(false);
    expect(result.canCommunicate.reason).toContain('Service completed');
  });

  it('should batch mark incoming messages as read', async () => {
    const mockDb = createMockDb();
    const dbArg = mockDb as unknown as Parameters<typeof sendBookingMessage>[4];
    const result = await markMessagesAsRead(driverUserId, bookingId, dbArg);

    expect(result.updatedCount).toBe(1);
    expect(mockDb.bookingMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bookingId,
          senderUserId: { not: driverUserId },
          readAt: null,
        }),
      }),
    );
    expect(mockDb.outboxEvent.create).toHaveBeenCalled();
  });

  it('should create system operational messages', async () => {
    const mockDb = createMockDb();
    const dbArg = mockDb as unknown as Parameters<typeof sendBookingMessage>[4];
    const sysMsg = await createSystemBookingMessage(
      bookingId,
      'Driver has arrived at your pickup location.',
      dbArg,
    );

    expect(sysMsg).toBeDefined();
    expect(sysMsg?.senderRole).toBe('SYSTEM');
    expect(sysMsg?.messageType).toBe('SYSTEM');
    expect(sysMsg?.body).toBe('Driver has arrived at your pickup location.');
  });
});
