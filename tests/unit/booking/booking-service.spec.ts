import {
  createBooking,
  cancelBooking,
  getBookingById,
  listRecentCompletedBookings,
} from '@/modules/booking/application/booking-service';
import { BookingStatus, BookingType } from '@prisma/client';
import {
  BookingNotFoundError,
  DriverSelectionRequiredError,
  SelectedDriverUnavailableError,
} from '@/modules/booking/domain/errors';

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
  // No promotion applied in these tests by default: no prior usage for this
  // booking, and no automatic promotions to consider.
  promotionUsage: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
  promotion: {
    findMany: jest.fn().mockResolvedValue([]),
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
    customerFavoriteDriver: {
      findUnique: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
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
  getString: jest
    .fn()
    .mockImplementation((_key, defaultVal) => Promise.resolve(defaultVal ?? '100.0000')),
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
  const mockFavoriteFindUnique = prisma.customerFavoriteDriver.findUnique as jest.Mock;
  const mockDriverProfileFindUnique = prisma.driverProfile.findUnique as jest.Mock;
  const mockBookingFindMany = prisma.booking.findMany as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFavoriteFindUnique.mockResolvedValue(null);
    mockDriverProfileFindUnique.mockResolvedValue(null);
    mockBookingFindMany.mockResolvedValue([]);
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

    describe('preferred driver preference', () => {
      const mockBooking = {
        id: 'bk-1',
        customerId: 'cust-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.ONE_WAY,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        pickupAddress: 'Connaught Place, New Delhi',
        requestedAt: new Date(),
        searchStartedAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
        createdAt: new Date(),
        updatedAt: new Date(),
        driverProfile: null,
      };

      beforeEach(() => {
        mockTx.booking.create.mockResolvedValue(mockBooking);
        mockFindUniqueOrThrow.mockResolvedValue(mockBooking);
        mockFindUnique.mockResolvedValue(null); // no idempotency-key collision
      });

      it('stores the preference when the driver is an approved favorite of this customer', async () => {
        mockFavoriteFindUnique.mockResolvedValue({
          customerId: 'cust-1',
          driverProfileId: 'driver-1',
        });
        mockDriverProfileFindUnique.mockResolvedValue({ approvalStatus: 'APPROVED' });

        await createBooking('cust-1', {
          pickupLocation: {
            latitude: 28.6139,
            longitude: 77.209,
            address: 'Connaught Place, New Delhi',
          },
          preferredDriverProfileId: 'driver-1',
        });

        expect(mockFavoriteFindUnique).toHaveBeenCalledWith({
          where: {
            customerId_driverProfileId: { customerId: 'cust-1', driverProfileId: 'driver-1' },
          },
        });
        expect(mockTx.booking.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ preferredDriverProfileId: 'driver-1' }),
          }),
        );
      });

      it("silently drops the preference when the driver is not one of this customer's own favorites (IDOR guard)", async () => {
        mockFavoriteFindUnique.mockResolvedValue(null); // belongs to a different customer, or never favorited

        await createBooking('cust-1', {
          pickupLocation: {
            latitude: 28.6139,
            longitude: 77.209,
            address: 'Connaught Place, New Delhi',
          },
          preferredDriverProfileId: 'someone-elses-favorite-driver',
        });

        expect(mockTx.booking.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ preferredDriverProfileId: null }),
          }),
        );
      });

      it('silently drops the preference when the favorited driver is no longer approved', async () => {
        mockFavoriteFindUnique.mockResolvedValue({
          customerId: 'cust-1',
          driverProfileId: 'driver-1',
        });
        mockDriverProfileFindUnique.mockResolvedValue({ approvalStatus: 'SUSPENDED' });

        await createBooking('cust-1', {
          pickupLocation: {
            latitude: 28.6139,
            longitude: 77.209,
            address: 'Connaught Place, New Delhi',
          },
          preferredDriverProfileId: 'driver-1',
        });

        expect(mockTx.booking.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ preferredDriverProfileId: null }),
          }),
        );
      });

      it('does not look up a preference at all when none is supplied', async () => {
        await createBooking('cust-1', {
          pickupLocation: {
            latitude: 28.6139,
            longitude: 77.209,
            address: 'Connaught Place, New Delhi',
          },
        });

        expect(mockFavoriteFindUnique).not.toHaveBeenCalled();
        expect(mockTx.booking.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ preferredDriverProfileId: null }),
          }),
        );
      });
    });

    describe('required driver selection for DAILY/WEEKLY/MONTHLY hires', () => {
      const mockHireBooking = {
        id: 'bk-hire-1',
        customerId: 'cust-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.WEEKLY,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        pickupAddress: 'Connaught Place, New Delhi',
        requestedAt: new Date(),
        searchStartedAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
        createdAt: new Date(),
        updatedAt: new Date(),
        driverProfile: null,
      };

      beforeEach(() => {
        mockTx.booking.create.mockResolvedValue(mockHireBooking);
        mockFindUniqueOrThrow.mockResolvedValue(mockHireBooking);
        mockFindUnique.mockResolvedValue(null); // no idempotency-key collision
      });

      it('rejects a WEEKLY booking with no preferredDriverProfileId — no platform-rate fallback for this booking type', async () => {
        await expect(
          createBooking('cust-1', {
            pickupLocation: {
              latitude: 28.6139,
              longitude: 77.209,
              address: 'Connaught Place, New Delhi',
            },
            bookingType: BookingType.WEEKLY,
            hireDurationMinutes: 10080,
          }),
        ).rejects.toBeInstanceOf(DriverSelectionRequiredError);

        expect(mockTx.booking.create).not.toHaveBeenCalled();
      });

      it("does not require the selected driver to be one of the customer's favorites, unlike every other booking type", async () => {
        mockDriverProfileFindUnique.mockResolvedValue({
          id: 'driver-1',
          approvalStatus: 'APPROVED',
          availabilityStatus: 'AVAILABLE',
          weeklyHireRate: { toString: () => '15000.0000' },
        });

        await createBooking('cust-1', {
          pickupLocation: {
            latitude: 28.6139,
            longitude: 77.209,
            address: 'Connaught Place, New Delhi',
          },
          bookingType: BookingType.WEEKLY,
          hireDurationMinutes: 10080,
          preferredDriverProfileId: 'driver-1',
        });

        // Never even checked CustomerFavoriteDriver — this path is a required
        // direct selection, not a favorites-scoped preference.
        expect(mockFavoriteFindUnique).not.toHaveBeenCalled();
        expect(mockTx.booking.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              preferredDriverProfileId: 'driver-1',
              driverCustomRateSnapshot: '15000.0000',
            }),
          }),
        );
      });

      it('rejects the booking when the selected driver has not set a rate for this hire type', async () => {
        mockDriverProfileFindUnique.mockResolvedValue({
          id: 'driver-1',
          approvalStatus: 'APPROVED',
          availabilityStatus: 'AVAILABLE',
          weeklyHireRate: null,
        });

        await expect(
          createBooking('cust-1', {
            pickupLocation: {
              latitude: 28.6139,
              longitude: 77.209,
              address: 'Connaught Place, New Delhi',
            },
            bookingType: BookingType.WEEKLY,
            hireDurationMinutes: 10080,
            preferredDriverProfileId: 'driver-1',
          }),
        ).rejects.toBeInstanceOf(SelectedDriverUnavailableError);

        expect(mockTx.booking.create).not.toHaveBeenCalled();
      });

      it('rejects the booking when the selected driver already has a conflicting hire for the requested window', async () => {
        mockDriverProfileFindUnique.mockResolvedValue({
          id: 'driver-1',
          approvalStatus: 'APPROVED',
          availabilityStatus: 'AVAILABLE',
          weeklyHireRate: { toString: () => '15000.0000' },
        });
        mockBookingFindMany.mockResolvedValue([{ driverProfileId: 'driver-1' }]);

        await expect(
          createBooking('cust-1', {
            pickupLocation: {
              latitude: 28.6139,
              longitude: 77.209,
              address: 'Connaught Place, New Delhi',
            },
            bookingType: BookingType.WEEKLY,
            hireDurationMinutes: 10080,
            preferredDriverProfileId: 'driver-1',
          }),
        ).rejects.toBeInstanceOf(SelectedDriverUnavailableError);

        expect(mockTx.booking.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('listRecentCompletedBookings', () => {
    it('scopes the query to the calling customer and caps it at 5, ordered by trip completion', async () => {
      const mockFindMany = prisma.booking.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      await listRecentCompletedBookings('cust-1');

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1', status: BookingStatus.TRIP_COMPLETED },
        include: { driverProfile: true },
        orderBy: { tripCompletedAt: 'desc' },
        take: 5,
      });
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

    it('rejects cancellation by a user who does not own the booking', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'bk-1',
        customerId: 'cust-1',
        status: BookingStatus.SEARCHING_DRIVER,
        driverProfile: null,
      });

      await expect(cancelBooking('someone-else', 'bk-1', 'not mine')).rejects.toBeInstanceOf(
        BookingNotFoundError,
      );
      expect(mockTx.booking.update).not.toHaveBeenCalled();
    });
  });

  describe('getBookingById', () => {
    it('returns the booking for its owning customer', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'bk-1',
        customerId: 'cust-1',
        driverProfile: null,
        status: BookingStatus.TRIP_COMPLETED,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        pickupAddress: 'Connaught Place',
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getBookingById('cust-1', 'bk-1');
      expect(result.id).toBe('bk-1');
    });

    it('returns the booking for its assigned driver', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'bk-1',
        customerId: 'cust-1',
        driverProfile: { userId: 'driver-user-1' },
        status: BookingStatus.TRIP_COMPLETED,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        pickupAddress: 'Connaught Place',
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getBookingById('driver-user-1', 'bk-1');
      expect(result.id).toBe('bk-1');
    });

    it('rejects a caller who is neither the customer nor the assigned driver (cross-user access attempt)', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'bk-1',
        customerId: 'cust-1',
        driverProfile: { userId: 'driver-user-1' },
        status: BookingStatus.TRIP_COMPLETED,
      });

      await expect(getBookingById('some-other-customer', 'bk-1')).rejects.toBeInstanceOf(
        BookingNotFoundError,
      );
    });
  });
});
