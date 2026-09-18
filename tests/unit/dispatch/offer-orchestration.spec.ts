import { orchestrateDispatchOffers } from '@/modules/dispatch/application/offer-orchestration-service';
import { acceptAssignmentOffer } from '@/modules/booking/application/assignment-service';
import { BookingStatus, AssignmentAttemptStatus, DriverAvailabilityStatus } from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

jest.mock('@/modules/location/application/nearby-driver-service', () => ({
  findNearbyDrivers: jest.fn().mockResolvedValue([
    {
      driverId: 'driver-1',
      displayName: 'Driver One',
      location: { latitude: 19.01, longitude: 72.85 },
      distanceMeters: 1000,
    },
    {
      driverId: 'driver-2',
      displayName: 'Driver Two',
      location: { latitude: 19.02, longitude: 72.86 },
      distanceMeters: 2000,
    },
  ]),
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({ isEligible: true, reasons: [] }),
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn().mockImplementation((userId: string) => {
    return Promise.resolve({
      id: userId === 'user-d1' ? 'driver-1' : 'driver-2',
      userId,
      displayName: 'Driver Profile',
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
    });
  }),
}));

jest.mock('@/modules/location/application/driver-location-service', () => ({
  removeDriverFromLiveIndex: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/modules/driver/application/services/driver-hire-conflict-service', () => ({
  assertNoDriverHireConflict: jest.fn().mockResolvedValue(true),
}));

describe('Phase 60 — Intelligent Dispatch Orchestration & Concurrency Safety', () => {
  describe('Offer Orchestration Strategies', () => {
    const mockDb = {
      booking: {
        findUnique: jest.fn().mockImplementation(() =>
          Promise.resolve({
            id: 'bk-100',
            status: BookingStatus.SEARCHING_DRIVER,
            pickupLatitude: 19.0,
            pickupLongitude: 72.84,
            requestedAt: new Date(),
            createdAt: new Date(),
            searchStartedAt: new Date(),
            expiresAt: new Date(Date.now() + 120000),
            assignmentAttempts: [],
          }),
        ),
      },
      driverCurrentLocation: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      driverRatingSummary: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      customerFavoriteDriver: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      bookingAssignmentAttempt: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => {
        const tx = {
          bookingAssignmentAttempt: {
            create: jest.fn().mockImplementation(({ data }) =>
              Promise.resolve({
                id: `att-${data.driverProfileId}`,
                ...data,
              }),
            ),
          },
          outboxEvent: { create: jest.fn().mockResolvedValue({}) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      }),
    } as unknown as Db;

    it('orchestrates sequential offer creation by default', async () => {
      const result = await orchestrateDispatchOffers('bk-100', { strategy: 'SEQUENTIAL' }, mockDb);

      expect(result.status).toBe('OFFERED');
      expect(result.strategy).toBe('SEQUENTIAL');
      expect(result.offeredAttemptsCount).toBe(1);
      expect(result.attemptIds.length).toBe(1);
    });

    it('orchestrates bounded parallel offers when configured', async () => {
      const result = await orchestrateDispatchOffers(
        'bk-100',
        { strategy: 'PARALLEL', batchSize: 2 },
        mockDb,
      );

      expect(result.status).toBe('OFFERED');
      expect(result.strategy).toBe('PARALLEL');
      expect(result.offeredAttemptsCount).toBe(2);
      expect(result.attemptIds.length).toBe(2);
    });
  });

  describe('Concurrency & Acceptance Superseding', () => {
    it('supersedes other pending offers when a driver accepts an offer', async () => {
      const attempt1 = {
        id: 'att-1',
        bookingId: 'bk-200',
        driverProfileId: 'driver-1',
        status: AssignmentAttemptStatus.PENDING,
        expiresAt: new Date(Date.now() + 60000),
        booking: {
          id: 'bk-200',
          status: BookingStatus.SEARCHING_DRIVER,
          pickupLatitude: 19.0,
          pickupLongitude: 72.84,
          pickupAddress: 'Pickup St',
          pickupLabel: null,
          bookingType: 'ONE_WAY',
          requestedStartTime: null,
          customerNotes: null,
        },
      };

      const mockTx = {
        bookingAssignmentAttempt: {
          findUnique: jest.fn().mockResolvedValue(attempt1),
          findMany: jest.fn().mockResolvedValue([{ id: 'att-2', driverProfileId: 'driver-2' }]),
          update: jest.fn().mockResolvedValue({}),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        booking: {
          update: jest.fn().mockResolvedValue({}),
        },
        driverProfile: {
          update: jest.fn().mockResolvedValue({}),
        },
        bookingLog: {
          create: jest.fn().mockResolvedValue({}),
        },
        outboxEvent: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      const mockDb = {
        $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      } as unknown as Db;

      await acceptAssignmentOffer('user-d1', 'att-1', mockDb);

      expect(mockTx.bookingAssignmentAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'att-1' },
          data: expect.objectContaining({ status: AssignmentAttemptStatus.ACCEPTED }),
        }),
      );

      expect(mockTx.bookingAssignmentAttempt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookingId: 'bk-200', id: { not: 'att-1' }, status: AssignmentAttemptStatus.PENDING },
          data: expect.objectContaining({ status: AssignmentAttemptStatus.CANCELLED }),
        }),
      );
    });
  });
});
