import { findAndOfferNextDriver } from '@/modules/booking/application/matching-service';
import { BookingStatus, AssignmentAttemptStatus, BookingType } from '@prisma/client';

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
      findMany: jest.fn().mockResolvedValue([]),
    },
    bookingAssignmentAttempt: {
      updateMany: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve({
          id: where.id,
          user: { id: 'u-1', accountStatus: 'ACTIVE' },
          approvalStatus: 'APPROVED',
          verificationStatus: 'VERIFIED',
          onboardingStatus: 'COMPLETED',
          documents: [],
        }),
      ),
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
  getJson: jest
    .fn()
    .mockImplementation((_key: string, defaultValue: unknown) => Promise.resolve(defaultValue)),
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
  const mockFindManyBooking = prisma.booking.findMany as jest.Mock;
  const mockFindNearby = findNearbyDrivers as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindManyBooking.mockResolvedValue([]);
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

  describe('preferred driver preference', () => {
    const candidates = [
      {
        driverId: 'dp-nearest',
        displayName: 'Nearest Driver',
        distanceMeters: 800,
        distanceFormatted: '0.8 km',
      },
      {
        driverId: 'dp-preferred',
        displayName: 'Preferred Driver',
        distanceMeters: 3000,
        distanceFormatted: '3 km',
      },
    ];

    it("offers the customer's preferred driver even when a closer candidate exists, as long as the preferred driver is in the eligible pool", async () => {
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        preferredDriverProfileId: 'dp-preferred',
        assignmentAttempts: [],
      });
      mockFindNearby.mockResolvedValue(candidates);
      mockTx.bookingAssignmentAttempt.create.mockResolvedValue({
        id: 'att-1',
        driverProfileId: 'dp-preferred',
        attemptNumber: 1,
        status: AssignmentAttemptStatus.PENDING,
      });

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('OFFERED');
      expect(mockTx.bookingAssignmentAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ driverProfileId: 'dp-preferred' }),
        }),
      );
    });

    it('falls back to the nearest candidate when the preferred driver is not in the current eligible/nearby pool', async () => {
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        preferredDriverProfileId: 'dp-offline-elsewhere',
        assignmentAttempts: [],
      });
      mockFindNearby.mockResolvedValue(candidates);
      mockTx.bookingAssignmentAttempt.create.mockResolvedValue({
        id: 'att-1',
        driverProfileId: 'dp-nearest',
        attemptNumber: 1,
        status: AssignmentAttemptStatus.PENDING,
      });

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('OFFERED');
      expect(mockTx.bookingAssignmentAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ driverProfileId: 'dp-nearest' }),
        }),
      );
    });

    it('falls back to the nearest unattempted candidate once the preferred driver has already been offered and rejected', async () => {
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        preferredDriverProfileId: 'dp-preferred',
        assignmentAttempts: [{ driverProfileId: 'dp-preferred' }],
      });
      mockFindNearby.mockResolvedValue(candidates);
      mockTx.bookingAssignmentAttempt.create.mockResolvedValue({
        id: 'att-2',
        driverProfileId: 'dp-nearest',
        attemptNumber: 2,
        status: AssignmentAttemptStatus.PENDING,
      });

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('OFFERED');
      expect(mockTx.bookingAssignmentAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ driverProfileId: 'dp-nearest' }),
        }),
      );
    });
  });

  describe('driver-hire overlap conflict', () => {
    const hireCandidates = [
      {
        driverId: 'dp-committed',
        displayName: 'Committed Driver',
        distanceMeters: 500,
        distanceFormatted: '0.5 km',
      },
      {
        driverId: 'dp-free',
        displayName: 'Free Driver',
        distanceMeters: 900,
        distanceFormatted: '0.9 km',
      },
    ];

    it('excludes a candidate already committed to an overlapping hire window for a new WEEKLY hire booking', async () => {
      const hireStartAt = new Date('2026-10-01T10:00:00Z');
      const hireEndAt = new Date('2026-10-08T10:00:00Z');
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.WEEKLY,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        hireStartAt,
        hireEndAt,
        assignmentAttempts: [],
      });
      mockFindNearby.mockResolvedValue(hireCandidates);
      // dp-committed already has an overlapping assigned hire.
      mockFindManyBooking.mockResolvedValue([{ driverProfileId: 'dp-committed' }]);
      mockTx.bookingAssignmentAttempt.create.mockResolvedValue({
        id: 'att-1',
        driverProfileId: 'dp-free',
        attemptNumber: 1,
        status: AssignmentAttemptStatus.PENDING,
      });

      const result = await findAndOfferNextDriver('bk-1');

      expect(mockFindManyBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            driverProfileId: { in: ['dp-committed', 'dp-free'] },
            hireStartAt: { lt: hireEndAt },
            hireEndAt: { gt: hireStartAt },
          }),
        }),
      );
      expect(result.status).toBe('OFFERED');
      expect(mockTx.bookingAssignmentAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ driverProfileId: 'dp-free' }) }),
      );
    });

    it('reports NO_DRIVERS_FOUND when every nearby candidate has an overlapping hire commitment', async () => {
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.DAILY,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        hireStartAt: new Date('2026-10-01T10:00:00Z'),
        hireEndAt: new Date('2026-10-02T10:00:00Z'),
        assignmentAttempts: [],
      });
      mockFindNearby.mockResolvedValue(hireCandidates);
      mockFindManyBooking.mockResolvedValue([
        { driverProfileId: 'dp-committed' },
        { driverProfileId: 'dp-free' },
      ]);

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('NO_DRIVERS_FOUND');
      expect(mockTx.bookingAssignmentAttempt.create).not.toHaveBeenCalled();
    });

    it('does not run the hire-conflict query for a point-to-point booking', async () => {
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.POINT_TO_POINT,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        hireStartAt: null,
        hireEndAt: null,
        assignmentAttempts: [],
      });
      mockFindNearby.mockResolvedValue(hireCandidates);
      mockTx.bookingAssignmentAttempt.create.mockResolvedValue({
        id: 'att-1',
        driverProfileId: 'dp-committed',
        attemptNumber: 1,
        status: AssignmentAttemptStatus.PENDING,
      });

      await findAndOfferNextDriver('bk-1');

      expect(mockFindManyBooking).not.toHaveBeenCalled();
    });
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
