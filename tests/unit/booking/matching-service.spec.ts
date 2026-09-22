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
      findFirst: jest.fn().mockResolvedValue(null),
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
          availabilityStatus: 'AVAILABLE',
          verificationStatus: 'VERIFIED',
          onboardingStatus: 'COMPLETED',
          firstName: 'Test',
          lastName: 'Driver',
          dateOfBirth: new Date('1990-01-01'),
          primaryServiceArea: 'Delhi NCR',
          drivingExperienceYears: 5,
          // A genuinely-eligible driver per evaluateDriverEligibilityFromProfile's
          // document-verification requirement — needed now that
          // isDriverDispatchEligible (which runs this same check) is
          // actually exercised in the dispatch-eligibility-gate tests below.
          documents: [
            { documentType: 'DRIVING_LICENSE', status: 'VERIFIED', expiresAt: null },
            { documentType: 'AADHAAR_CARD', status: 'VERIFIED', expiresAt: null },
          ],
        }),
      ),
    },
    driverVehicleCapability: {
      findFirst: jest.fn(),
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

// isDriverDispatchEligible (called for real, not mocked, to actually exercise
// the new dispatch-eligibility gate) transitively calls
// driverScheduleService.isDriverWithinSchedule — a real DB-touching method
// this file's mocked prisma object has no matching models for. Only this one
// method is stubbed; isDriverDispatchEligible's compliance/availability/
// active-booking checks still run against the real driverProfile/booking
// mocks above.
jest.mock('@/modules/driver/application/services/driver-schedule-service', () => ({
  driverScheduleService: {
    isDriverWithinSchedule: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

import { prisma } from '@/shared/database/prisma';
import { findNearbyDrivers } from '@/modules/location/application/nearby-driver-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { driverScheduleService } from '@/modules/driver/application/services/driver-schedule-service';

describe('MatchingService', () => {
  const mockFindUniqueBooking = prisma.booking.findUnique as jest.Mock;
  const mockFindManyBooking = prisma.booking.findMany as jest.Mock;
  const mockFindNearby = findNearbyDrivers as jest.Mock;
  const mockInsertOutboxEvent = insertOutboxEvent as jest.Mock;
  const mockDriverProfileFindUnique = prisma.driverProfile.findUnique as jest.Mock;
  const mockIsDriverWithinSchedule = driverScheduleService.isDriverWithinSchedule as jest.Mock;
  const mockFindFirstBooking = prisma.booking.findFirst as jest.Mock;

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

  it("includes the offered driver's userId in the outbox payload, so the driver actually gets notified (regression: payload previously only carried driverProfileId)", async () => {
    mockFindUniqueBooking.mockResolvedValue({
      id: 'bk-1',
      status: BookingStatus.SEARCHING_DRIVER,
      pickupLatitude: 28.6139,
      pickupLongitude: 77.209,
      expiresAt: new Date(Date.now() + 300000),
      assignmentAttempts: [],
    });
    mockFindNearby.mockResolvedValue([
      { driverId: 'dp-1', displayName: 'Rajesh Kumar', distanceMeters: 1200 },
    ]);
    mockDriverProfileFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({
        id: where.id,
        userId: 'user-of-dp-1',
        user: { id: 'user-of-dp-1', accountStatus: 'ACTIVE' },
        approvalStatus: 'APPROVED',
        availabilityStatus: 'AVAILABLE',
        verificationStatus: 'VERIFIED',
        onboardingStatus: 'COMPLETED',
        firstName: 'Test',
        lastName: 'Driver',
        dateOfBirth: new Date('1990-01-01'),
        primaryServiceArea: 'Delhi NCR',
        drivingExperienceYears: 5,
        documents: [
          { documentType: 'DRIVING_LICENSE', status: 'VERIFIED', expiresAt: null },
          { documentType: 'AADHAAR_CARD', status: 'VERIFIED', expiresAt: null },
        ],
      }),
    );
    mockTx.bookingAssignmentAttempt.create.mockResolvedValue({
      id: 'att-1',
      driverProfileId: 'dp-1',
      attemptNumber: 1,
      status: AssignmentAttemptStatus.PENDING,
    });

    await findAndOfferNextDriver('bk-1');

    expect(mockInsertOutboxEvent).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        eventType: 'booking.driver.offered',
        payload: expect.objectContaining({ driverProfileId: 'dp-1', driverUserId: 'user-of-dp-1' }),
      }),
    );
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

    it('excludes a candidate already committed to an overlapping hire window for a new HOURLY hire booking', async () => {
      // HOURLY (unlike DAILY/WEEKLY/MONTHLY) still uses the geo-proximity
      // candidate pool + conflict filter below — it has no required
      // single-driver selection.
      const hireStartAt = new Date('2026-10-01T10:00:00Z');
      const hireEndAt = new Date('2026-10-08T10:00:00Z');
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.HOURLY,
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
        bookingType: BookingType.FULL_DAY,
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

  describe('DAILY/WEEKLY/MONTHLY required single-driver selection (no fallback)', () => {
    it("offers only the customer's selected driver for a WEEKLY booking, bypassing geo-proximity search entirely", async () => {
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
        preferredDriverProfileId: 'dp-selected',
        assignmentAttempts: [],
      });
      mockFindManyBooking.mockResolvedValue([]); // no conflicting hires
      mockTx.bookingAssignmentAttempt.create.mockResolvedValue({
        id: 'att-1',
        driverProfileId: 'dp-selected',
        attemptNumber: 1,
        status: AssignmentAttemptStatus.PENDING,
      });

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('OFFERED');
      expect(mockFindNearby).not.toHaveBeenCalled();
      expect(mockTx.bookingAssignmentAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ driverProfileId: 'dp-selected' }),
        }),
      );
    });

    it('expires the search instead of offering the selected driver when their only vehicle capability is for a deactivated category', async () => {
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
        preferredDriverProfileId: 'dp-selected',
        vehicleCategoryId: 'vc-suv',
        assignmentAttempts: [],
      });
      mockFindManyBooking.mockResolvedValue([]);
      // The driver has a capability row for this category, but the
      // category itself has since been deactivated — must not count as
      // capable (matches the geo-pool path's `vehicleCategory: { isActive:
      // true }` filter, which this required-single-driver path previously
      // omitted).
      (prisma.driverVehicleCapability.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('NO_DRIVERS_FOUND');
      expect(mockFindNearby).not.toHaveBeenCalled();
      expect(mockTx.bookingAssignmentAttempt.create).not.toHaveBeenCalled();
      expect(prisma.driverVehicleCapability.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            driverProfileId: 'dp-selected',
            vehicleCategoryId: 'vc-suv',
            vehicleCategory: { isActive: true },
          }),
        }),
      );
    });

    it('expires the search instead of falling back to another driver when the selected driver already has a conflicting hire', async () => {
      const hireStartAt = new Date('2026-10-01T10:00:00Z');
      const hireEndAt = new Date('2026-10-08T10:00:00Z');
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.MONTHLY,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        hireStartAt,
        hireEndAt,
        preferredDriverProfileId: 'dp-selected',
        assignmentAttempts: [],
      });
      // The chosen driver already has a conflicting hire for this window.
      mockFindManyBooking.mockResolvedValue([{ driverProfileId: 'dp-selected' }]);

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('NO_DRIVERS_FOUND');
      expect(mockFindNearby).not.toHaveBeenCalled();
      expect(mockTx.bookingAssignmentAttempt.create).not.toHaveBeenCalled();
    });

    it('expires the search when the selected driver has already been offered and rejected, without offering a different driver', async () => {
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.DAILY,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        hireStartAt: new Date('2026-10-01T10:00:00Z'),
        hireEndAt: new Date('2026-10-02T10:00:00Z'),
        preferredDriverProfileId: 'dp-selected',
        assignmentAttempts: [{ driverProfileId: 'dp-selected' }],
      });

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('NO_DRIVERS_FOUND');
      expect(mockFindNearby).not.toHaveBeenCalled();
      expect(mockTx.bookingAssignmentAttempt.create).not.toHaveBeenCalled();
    });
  });

  describe('dispatch eligibility gate (Phase 70)', () => {
    it('skips a top-ranked candidate who is outside their shift schedule and offers the next eligible nearby candidate instead', async () => {
      const candidates = [
        { driverId: 'dp-off-shift', displayName: 'Off Shift Driver', distanceMeters: 500 },
        { driverId: 'dp-on-shift', displayName: 'On Shift Driver', distanceMeters: 900 },
      ];
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        assignmentAttempts: [],
      });
      mockFindNearby.mockResolvedValue(candidates);
      mockIsDriverWithinSchedule.mockImplementation((driverProfileId: string) =>
        Promise.resolve(driverProfileId !== 'dp-off-shift'),
      );
      mockTx.bookingAssignmentAttempt.create.mockResolvedValue({
        id: 'att-1',
        driverProfileId: 'dp-on-shift',
        attemptNumber: 1,
        status: AssignmentAttemptStatus.PENDING,
      });

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('OFFERED');
      expect(mockTx.bookingAssignmentAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ driverProfileId: 'dp-on-shift' }),
        }),
      );
    });

    it('reports NO_DRIVERS_FOUND when every nearby candidate fails the dispatch-eligibility gate (e.g. all off-shift)', async () => {
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        assignmentAttempts: [],
      });
      mockFindNearby.mockResolvedValue([
        { driverId: 'dp-1', displayName: 'Driver One', distanceMeters: 500 },
      ]);
      mockIsDriverWithinSchedule.mockResolvedValue(false);

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('NO_DRIVERS_FOUND');
      expect(mockTx.bookingAssignmentAttempt.create).not.toHaveBeenCalled();
    });

    it("blocks offering the customer's selected DAILY/WEEKLY/MONTHLY driver when they have an undetected active-booking conflict (active-booking check, not just availabilityStatus)", async () => {
      mockFindUniqueBooking.mockResolvedValue({
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: BookingType.WEEKLY,
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        expiresAt: new Date(Date.now() + 300000),
        hireStartAt: new Date('2026-10-01T10:00:00Z'),
        hireEndAt: new Date('2026-10-08T10:00:00Z'),
        preferredDriverProfileId: 'dp-selected',
        assignmentAttempts: [],
      });
      mockFindManyBooking.mockResolvedValue([]); // no overlapping hire-window conflict
      // availabilityStatus says AVAILABLE (default mock), but the driver
      // still has an active booking in progress — the authoritative
      // active-booking check inside isDriverDispatchEligible must catch
      // this even though the shallower availabilityStatus check above it
      // would not.
      mockFindFirstBooking.mockResolvedValue({ id: 'bk-other-active' });

      const result = await findAndOfferNextDriver('bk-1');

      expect(result.status).toBe('NO_DRIVERS_FOUND');
      expect(mockTx.bookingAssignmentAttempt.create).not.toHaveBeenCalled();
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
