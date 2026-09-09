import { findAndOfferNextDriver } from '@/modules/booking/application/matching-service';
import { BookingStatus, AssignmentAttemptStatus } from '@prisma/client';

const mockTx = {
  bookingAssignmentAttempt: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  booking: {
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
      update: jest.fn(),
    },
    bookingAssignmentAttempt: {
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: jest.fn().mockImplementation((key: string, defaultValue: number) => {
    if (key === 'booking.matching.initial_radius_meters') return Promise.resolve(5000);
    if (key === 'booking.matching.radius_increment_meters') return Promise.resolve(2500);
    if (key === 'booking.matching.maximum_radius_meters') return Promise.resolve(20000);
    if (key === 'booking.matching.driver_response_timeout_seconds') return Promise.resolve(30);
    if (key === 'booking.matching.maximum_candidate_attempts') return Promise.resolve(5);
    if (key === 'booking.matching.search_timeout_seconds') return Promise.resolve(300);
    return Promise.resolve(defaultValue);
  }),
}));

jest.mock('@/modules/location/application/nearby-driver-service', () => ({
  findNearbyDrivers: jest.fn(),
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

import { prisma } from '@/shared/database/prisma';
import { findNearbyDrivers } from '@/modules/location/application/nearby-driver-service';

describe('MatchingService', () => {
  const mockFindUniqueBooking = prisma.booking.findUnique as jest.Mock;
  const mockFindNearby = findNearbyDrivers as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('discovers candidate driver and creates assignment attempt offer', async () => {
    mockFindUniqueBooking.mockResolvedValue({
      id: 'bk-1',
      status: BookingStatus.SEARCHING_DRIVER,
      pickupLatitude: 28.6139,
      pickupLongitude: 77.209,
      expiresAt: new Date(Date.now() + 300000),
      assignmentAttempts: [],
    });

    mockFindNearby.mockResolvedValue([
      {
        driverId: 'dp-1',
        displayName: 'Rajesh Kumar',
        distanceMeters: 1200,
        distanceFormatted: '1.2 km',
      },
    ]);

    mockTx.bookingAssignmentAttempt.create.mockResolvedValue({
      id: 'att-1',
      bookingId: 'bk-1',
      driverProfileId: 'dp-1',
      attemptNumber: 1,
      status: AssignmentAttemptStatus.PENDING,
    });

    const result = await findAndOfferNextDriver('bk-1');

    expect(result.status).toBe('OFFERED');
    expect(result.attemptId).toBe('att-1');
  });

  it('expires search if maximum candidate attempts limit is reached', async () => {
    mockFindUniqueBooking.mockResolvedValue({
      id: 'bk-1',
      status: BookingStatus.SEARCHING_DRIVER,
      expiresAt: new Date(Date.now() + 300000),
      assignmentAttempts: [
        { driverProfileId: 'dp-1' },
        { driverProfileId: 'dp-2' },
        { driverProfileId: 'dp-3' },
        { driverProfileId: 'dp-4' },
        { driverProfileId: 'dp-5' },
      ],
    });

    const result = await findAndOfferNextDriver('bk-1');

    expect(result.status).toBe('MAX_ATTEMPTS_REACHED');
  });
});
