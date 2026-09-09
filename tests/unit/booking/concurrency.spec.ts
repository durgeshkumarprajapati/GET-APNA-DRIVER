import { acceptAssignmentOffer } from '@/modules/booking/application/assignment-service';
import { createBooking } from '@/modules/booking/application/booking-service';
import { BookingStatus, AssignmentAttemptStatus, BookingType } from '@prisma/client';
import {
  BookingAlreadyAssignedError,
  AssignmentOfferExpiredError,
} from '@/modules/booking/domain/errors';

const mockTx = {
  bookingAssignmentAttempt: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  booking: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  driverProfile: {
    update: jest.fn(),
  },
  bookingLog: {
    create: jest.fn(),
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
    },
  },
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn().mockImplementation((userId: string) => {
    if (userId === 'driver-1') return Promise.resolve({ id: 'dp-1', userId });
    if (userId === 'driver-2') return Promise.resolve({ id: 'dp-2', userId });
    return Promise.resolve({ id: `dp-${userId}`, userId });
  }),
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({ isEligible: true, reasons: [] }),
}));

jest.mock('@/modules/location/application/driver-location-service', () => ({
  removeDriverFromLiveIndex: jest.fn().mockResolvedValue(undefined),
  addDriverToLiveIndex: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: jest.fn().mockResolvedValue(300),
}));

jest.mock('@/modules/booking/application/matching-service', () => ({
  findAndOfferNextDriver: jest.fn().mockResolvedValue({ status: 'OFFERED' }),
}));

import { prisma } from '@/shared/database/prisma';

describe('Booking Concurrency & Idempotency Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles two drivers accepting assignment offers concurrently - second attempt fails safely', async () => {
    const attemptDriver1 = {
      id: 'att-1',
      driverProfileId: 'dp-1',
      status: AssignmentAttemptStatus.PENDING,
      expiresAt: new Date(Date.now() + 30000),
      booking: {
        id: 'bk-race',
        status: BookingStatus.SEARCHING_DRIVER,
      },
    };

    const attemptDriver2 = {
      id: 'att-2',
      driverProfileId: 'dp-2',
      status: AssignmentAttemptStatus.PENDING,
      expiresAt: new Date(Date.now() + 30000),
      booking: {
        id: 'bk-race',
        status: BookingStatus.DRIVER_ASSIGNED, // Already assigned by Driver 1
      },
    };

    // First call returns booking SEARCHING_DRIVER, second call returns DRIVER_ASSIGNED
    mockTx.bookingAssignmentAttempt.findUnique
      .mockResolvedValueOnce(attemptDriver1)
      .mockResolvedValueOnce(attemptDriver2);

    // Driver 1 accepts
    await acceptAssignmentOffer('driver-1', 'att-1');

    // Driver 2 accepts concurrently - must fail with BookingAlreadyAssignedError
    await expect(acceptAssignmentOffer('driver-2', 'att-2')).rejects.toThrow(
      BookingAlreadyAssignedError,
    );
  });

  it('rejects expired offer acceptance', async () => {
    const expiredAttempt = {
      id: 'att-late',
      driverProfileId: 'dp-1',
      status: AssignmentAttemptStatus.PENDING,
      expiresAt: new Date(Date.now() - 10000),
      booking: {
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
      },
    };

    mockTx.bookingAssignmentAttempt.findUnique.mockResolvedValue(expiredAttempt);

    await expect(acceptAssignmentOffer('driver-1', 'att-late')).rejects.toThrow(
      AssignmentOfferExpiredError,
    );
  });

  it('prevents duplicate booking creation via idempotency key', async () => {
    const mockExistingBooking = {
      id: 'bk-idem',
      idempotencyKey: 'idem-key-99',
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

    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockExistingBooking);

    const result = await createBooking(
      'cust-1',
      {
        pickupLocation: {
          latitude: 28.6139,
          longitude: 77.209,
          address: 'Connaught Place',
        },
      },
      'idem-key-99',
    );

    expect(result.id).toBe('bk-idem');
    expect(mockTx.booking.create).not.toHaveBeenCalled();
  });
});
