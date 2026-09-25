import { BookingStatus } from '@prisma/client';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
    bookingAssignmentAttempt: {
      findFirst: jest.fn(),
    },
    bookingMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

import { prisma } from '@/shared/database/prisma';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import {
  sendBookingMessage,
  listBookingMessages,
} from '@/modules/booking/application/booking-messaging-service';
import {
  BookingNotFoundError,
  MessagingNotAuthorizedError,
  MessagingNotAllowedError,
} from '@/modules/booking/domain/errors';

describe('BookingMessagingService', () => {
  const mockBookingFindUnique = prisma.booking.findUnique as jest.Mock;
  const mockDriverProfileFindUnique = prisma.driverProfile.findUnique as jest.Mock;
  const mockAttemptFindFirst = prisma.bookingAssignmentAttempt.findFirst as jest.Mock;
  const mockMessageCreate = prisma.bookingMessage.create as jest.Mock;
  const mockMessageFindMany = prisma.bookingMessage.findMany as jest.Mock;
  const mockInsertOutboxEvent = insertOutboxEvent as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseBooking = {
    id: 'bk-1',
    customerId: 'cust-1',
    status: BookingStatus.DRIVER_ASSIGNED,
    driverProfileId: 'dp-1',
    preferredDriverProfileId: null,
  };

  describe('sendBookingMessage', () => {
    it('throws BookingNotFoundError when the booking does not exist', async () => {
      mockBookingFindUnique.mockResolvedValue(null);
      await expect(sendBookingMessage('cust-1', 'bk-missing', 'hi')).rejects.toBeInstanceOf(
        BookingNotFoundError,
      );
    });

    it('lets the owning customer message the assigned driver', async () => {
      mockBookingFindUnique.mockResolvedValue(baseBooking);
      mockDriverProfileFindUnique.mockResolvedValue({ userId: 'driver-user-1' });
      mockMessageCreate.mockResolvedValue({
        id: 'msg-1',
        bookingId: 'bk-1',
        senderUserId: 'cust-1',
        body: 'On my way',
        createdAt: new Date(),
      });

      const result = await sendBookingMessage('cust-1', 'bk-1', 'On my way');

      expect(result.senderRole).toBe('CUSTOMER');
      expect(mockInsertOutboxEvent).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          eventType: 'booking.message.sent',
          payload: expect.objectContaining({
            recipientUserId: 'driver-user-1',
            recipientRole: 'DRIVER',
          }),
        }),
      );
    });

    it('lets a driver with a pending (not yet accepted) offer message the customer', async () => {
      mockBookingFindUnique.mockResolvedValue({
        ...baseBooking,
        status: BookingStatus.SEARCHING_DRIVER,
        driverProfileId: null,
        preferredDriverProfileId: 'dp-2',
      });
      mockDriverProfileFindUnique.mockResolvedValue({ id: 'dp-2', userId: 'driver-user-2' });
      mockMessageCreate.mockResolvedValue({
        id: 'msg-2',
        bookingId: 'bk-1',
        senderUserId: 'driver-user-2',
        body: 'On my way to accept',
        createdAt: new Date(),
      });

      const result = await sendBookingMessage('driver-user-2', 'bk-1', 'On my way to accept');

      expect(result.senderRole).toBe('DRIVER');
      expect(mockInsertOutboxEvent).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          payload: expect.objectContaining({
            recipientUserId: 'cust-1',
            recipientRole: 'CUSTOMER',
          }),
        }),
      );
    });

    it('rejects a driver who was never associated with this booking (not assigned, not preferred, never attempted)', async () => {
      mockBookingFindUnique.mockResolvedValue(baseBooking);
      mockDriverProfileFindUnique.mockResolvedValue({ id: 'dp-stranger' });
      mockAttemptFindFirst.mockResolvedValue(null);

      await expect(sendBookingMessage('stranger-driver-user', 'bk-1', 'hi')).rejects.toBeInstanceOf(
        MessagingNotAuthorizedError,
      );
      expect(mockMessageCreate).not.toHaveBeenCalled();
    });

    it('rejects the customer when no driver is associated with the booking yet', async () => {
      mockBookingFindUnique.mockResolvedValue({
        ...baseBooking,
        driverProfileId: null,
        preferredDriverProfileId: null,
      });

      await expect(sendBookingMessage('cust-1', 'bk-1', 'hi')).rejects.toBeInstanceOf(
        MessagingNotAuthorizedError,
      );
      expect(mockMessageCreate).not.toHaveBeenCalled();
    });

    it('rejects sending a new message once the booking is CANCELLED', async () => {
      mockBookingFindUnique.mockResolvedValue({
        ...baseBooking,
        status: BookingStatus.CANCELLED,
      });
      mockDriverProfileFindUnique.mockResolvedValue({ userId: 'driver-user-1' });

      await expect(sendBookingMessage('cust-1', 'bk-1', 'hi')).rejects.toBeInstanceOf(
        MessagingNotAllowedError,
      );
      expect(mockMessageCreate).not.toHaveBeenCalled();
    });
  });

  describe('listBookingMessages', () => {
    it('returns the thread labeled by sender role for an authorized participant', async () => {
      mockBookingFindUnique.mockResolvedValue(baseBooking);
      mockDriverProfileFindUnique.mockResolvedValue({ userId: 'driver-user-1' });
      mockMessageFindMany.mockResolvedValue([
        { id: 'm1', bookingId: 'bk-1', senderUserId: 'cust-1', body: 'hi', createdAt: new Date() },
        {
          id: 'm2',
          bookingId: 'bk-1',
          senderUserId: 'driver-user-1',
          body: 'hello back',
          createdAt: new Date(),
        },
      ]);

      const result = await listBookingMessages('cust-1', 'bk-1');

      expect(result.messages[0].senderRole).toBe('CUSTOMER');
      expect(result.messages[1].senderRole).toBe('DRIVER');
    });

    it('rejects an unrelated user from reading the thread', async () => {
      mockBookingFindUnique.mockResolvedValue(baseBooking);
      mockDriverProfileFindUnique.mockResolvedValue(null);

      await expect(listBookingMessages('random-user', 'bk-1')).rejects.toBeInstanceOf(
        MessagingNotAuthorizedError,
      );
    });
  });
});
