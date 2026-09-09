import { createBooking, cancelBooking } from '@/modules/booking/application/booking-service';
import { BookingStatus, BookingType } from '@prisma/client';

const mockTx = {
  booking: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  bookingLog: {
    create: jest.fn(),
  },
  bookingAssignmentAttempt: {
    updateMany: jest.fn(),
  },
  driverProfile: {
    update: jest.fn(),
  },
  outboxEvent: {
    create: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
    booking: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: jest.fn().mockResolvedValue(300),
  getBoolean: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/modules/booking/application/matching-service', () => ({
  findAndOfferNextDriver: jest.fn().mockResolvedValue({ status: 'OFFERED' }),
}));

jest.mock('@/modules/location/application/driver-location-service', () => ({
  addDriverToLiveIndex: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({ isEligible: true }),
}));

import { prisma } from '@/shared/database/prisma';

describe('BookingService', () => {
  const mockFindUnique = prisma.booking.findUnique as jest.Mock;
  const mockFindUniqueOrThrow = prisma.booking.findUniqueOrThrow as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('creates a new booking with pickup location snapshot', async () => {
      const mockBooking = {
        id: 'bk-1',
        customerId: 'cust-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.ONE_WAY,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        pickupAddress: 'Connaught Place, New Delhi',
        pickupLabel: 'Home',
        requestedAt: new Date(),
        searchStartedAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
        createdAt: new Date(),
        updatedAt: new Date(),
        driverProfile: null,
      };

      mockTx.booking.create.mockResolvedValue(mockBooking);
      mockFindUniqueOrThrow.mockResolvedValue(mockBooking);

      const result = await createBooking('cust-1', {
        pickupLocation: {
          latitude: 28.6139,
          longitude: 77.209,
          address: 'Connaught Place, New Delhi',
          label: 'Home',
        },
        bookingType: BookingType.ONE_WAY,
      });

      expect(result.id).toBe('bk-1');
      expect(result.status).toBe(BookingStatus.SEARCHING_DRIVER);
      expect(result.pickupLocation.address).toBe('Connaught Place, New Delhi');
    });

    it('handles idempotency key and returns existing booking', async () => {
      const mockBooking = {
        id: 'bk-existing',
        idempotencyKey: 'key-123',
        customerId: 'cust-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.ONE_WAY,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        pickupAddress: 'Connaught Place',
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        driverProfile: null,
      };

      mockFindUnique.mockResolvedValue(mockBooking);

      const result = await createBooking(
        'cust-1',
        {
          pickupLocation: {
            latitude: 28.6139,
            longitude: 77.209,
            address: 'Connaught Place',
          },
        },
        'key-123',
      );

      expect(result.id).toBe('bk-existing');
      expect(mockTx.booking.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelBooking', () => {
    it('cancels an active searching booking', async () => {
      const mockBooking = {
        id: 'bk-1',
        customerId: 'cust-1',
        status: BookingStatus.SEARCHING_DRIVER,
        driverProfileId: null,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        pickupAddress: 'Connaught Place',
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        driverProfile: null,
      };

      const mockCancelledBooking = {
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Plans changed',
      };

      mockFindUnique.mockResolvedValue(mockBooking);
      mockFindUniqueOrThrow.mockResolvedValue(mockCancelledBooking);

      const result = await cancelBooking('cust-1', 'bk-1', 'Plans changed');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(mockTx.booking.update).toHaveBeenCalled();
    });
  });
});
