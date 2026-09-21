import { orchestrateDispatchOffers } from '@/modules/dispatch/application/offer-orchestration-service';
import { BookingStatus } from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

jest.mock('@/modules/location/application/nearby-driver-service', () => ({
  findNearbyDrivers: jest.fn().mockResolvedValue([
    {
      driverId: 'driver-mini-only',
      displayName: 'Driver Mini',
      location: { latitude: 19.01, longitude: 72.85 },
      distanceMeters: 1000,
    },
    {
      driverId: 'driver-suv-only',
      displayName: 'Driver SUV',
      location: { latitude: 19.02, longitude: 72.86 },
      distanceMeters: 1500,
    },
  ]),
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({ isEligible: true, reasons: [] }),
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getString: jest.fn().mockResolvedValue('SEQUENTIAL'),
  getInteger: jest.fn().mockImplementation((_key: string, def: number) => Promise.resolve(def)),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn().mockResolvedValue(undefined),
}));

describe('Phase 67: Dispatch Vehicle Capability Hardening', () => {
  it('pre-filters candidates by booking.vehicleCategoryId before ranking & offer creation', async () => {
    const mockDb = {
      $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
        cb({
          bookingAssignmentAttempt: {
            create: jest.fn().mockImplementation(({ data }: { data: { driverProfileId: string } }) =>
              Promise.resolve({ id: `att-${data.driverProfileId}`, ...data }),
            ),
          },
          booking: { update: jest.fn() },
          outboxEvent: { create: jest.fn().mockResolvedValue({}) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        }),
      ),
      booking: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'booking-suv-req',
          status: BookingStatus.SEARCHING_DRIVER,
          vehicleCategoryId: 'cat-suv-id',
          pickupLatitude: 19.0,
          pickupLongitude: 72.8,
          assignmentAttempts: [],
          assignmentOffers: [],
          bookingType: 'ONE_WAY',
          requestedAt: new Date(),
          searchStartedAt: new Date(),
          expiresAt: new Date(Date.now() + 120000),
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      driverVehicleCapability: {
        findMany: jest.fn().mockResolvedValue([
          { driverProfileId: 'driver-suv-only' },
        ]),
        count: jest.fn().mockImplementation((args?: { where?: { driverProfileId?: string } }) =>
          Promise.resolve(args?.where?.driverProfileId === 'driver-suv-only' ? 1 : 0),
        ),
      },
      driverCurrentLocation: {
        findMany: jest.fn().mockResolvedValue([
          { driverProfileId: 'driver-suv-only', accuracy: 10, capturedAt: new Date() },
          { driverProfileId: 'driver-mini-only', accuracy: 10, capturedAt: new Date() },
        ]),
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
    } as unknown as Db;

    const result = await orchestrateDispatchOffers('booking-suv-req', {}, mockDb);

    expect(result.status).toBe('OFFERED');
    expect(mockDb.driverVehicleCapability.findMany).toHaveBeenCalledWith({
      where: {
        driverProfileId: { in: ['driver-mini-only', 'driver-suv-only'] },
        vehicleCategoryId: 'cat-suv-id',
        vehicleCategory: { isActive: true },
      },
      select: { driverProfileId: true },
    });
  });

  it('falls back seamlessly when booking has no vehicleCategoryId requirement', async () => {
    const mockDb = {
      $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
        cb({
          bookingAssignmentAttempt: {
            create: jest.fn().mockImplementation(({ data }: { data: { driverProfileId: string } }) =>
              Promise.resolve({ id: `att-${data.driverProfileId}`, ...data }),
            ),
          },
          booking: { update: jest.fn() },
          outboxEvent: { create: jest.fn().mockResolvedValue({}) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        }),
      ),
      booking: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'booking-any-vehicle',
          status: BookingStatus.SEARCHING_DRIVER,
          vehicleCategoryId: null,
          pickupLatitude: 19.0,
          pickupLongitude: 72.8,
          assignmentAttempts: [],
          assignmentOffers: [],
          bookingType: 'ONE_WAY',
          requestedAt: new Date(),
          searchStartedAt: new Date(),
          expiresAt: new Date(Date.now() + 120000),
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      driverVehicleCapability: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      driverCurrentLocation: {
        findMany: jest.fn().mockResolvedValue([
          { driverProfileId: 'driver-mini-only', accuracy: 10, capturedAt: new Date() },
          { driverProfileId: 'driver-suv-only', accuracy: 10, capturedAt: new Date() },
        ]),
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
    } as unknown as Db;

    const result = await orchestrateDispatchOffers('booking-any-vehicle', {}, mockDb);

    expect(result.status).toBe('OFFERED');
    expect(mockDb.driverVehicleCapability.findMany).not.toHaveBeenCalled();
  });
});
