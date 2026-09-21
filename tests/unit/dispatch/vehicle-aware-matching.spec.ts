import { rankCandidateDrivers } from '@/modules/dispatch/application/candidate-ranking-service';
import { listActiveDriversForHire } from '@/modules/booking/application/driver-hire-availability-service';
import { BookingType, DriverAvailabilityStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => {
  const mockDb = {
    driverProfile: {
      findMany: jest.fn(),
    },
    driverVehicleCapability: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    driverScheduleConflict: {
      findMany: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
  };
  return { prisma: mockDb };
});

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({ isEligible: true }),
}));

describe('Vehicle-Aware Dispatch & Matching', () => {
  const mockPrisma = prisma as unknown as {
    driverProfile: { findMany: jest.Mock };
    driverVehicleCapability: { findMany: jest.Mock; count: jest.Mock };
    booking: { findMany: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rankCandidateDrivers', () => {
    it('filters out candidates missing the required vehicle capability before ranking', async () => {
      mockPrisma.driverVehicleCapability.count.mockImplementation(
        async ({ where }: { where: { driverProfileId: string } }) => {
          return where.driverProfileId === 'driver-1' ? 1 : 0;
        },
      );

      const now = new Date();
      const candidates = [
        {
          driverProfileId: 'driver-1',
          displayName: 'Driver 1',
          latitude: 12.91,
          longitude: 77.51,
          accuracy: 10,
          capturedAt: now,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
        {
          driverProfileId: 'driver-2',
          displayName: 'Driver 2',
          latitude: 12.91,
          longitude: 77.51,
          accuracy: 10,
          capturedAt: now,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
      ];

      const ranked = await rankCandidateDrivers(
        candidates,
        {
          pickupLatitude: 12.9,
          pickupLongitude: 77.5,
          requestedVehicleCategory: 'vc-suv',
        },
        mockPrisma as unknown as Db,
      );

      expect(ranked).toHaveLength(1);
      expect(ranked[0].driverProfileId).toBe('driver-1');
    });

    it('retains all candidates when no vehicleCategoryId is required', async () => {
      const now = new Date();
      const candidates = [
        {
          driverProfileId: 'driver-1',
          displayName: 'Driver 1',
          latitude: 12.91,
          longitude: 77.51,
          accuracy: 10,
          capturedAt: now,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
        {
          driverProfileId: 'driver-2',
          displayName: 'Driver 2',
          latitude: 12.91,
          longitude: 77.51,
          accuracy: 10,
          capturedAt: now,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
      ];

      const ranked = await rankCandidateDrivers(
        candidates,
        {
          pickupLatitude: 12.9,
          pickupLongitude: 77.5,
          requestedVehicleCategory: null,
        },
        mockPrisma as unknown as Db,
      );

      expect(ranked).toHaveLength(2);
    });
  });

  describe('listActiveDriversForHire', () => {
    it('filters drivers for hire by vehicle category capability when specified', async () => {
      mockPrisma.driverProfile.findMany.mockImplementation(
        async ({
          where,
        }: {
          where?: { vehicleCapabilities?: { some?: { vehicleCategoryId?: string } } };
        }) => {
          const reqCap = where?.vehicleCapabilities?.some?.vehicleCategoryId;
          const allDrivers = [
            {
              id: 'driver-suv',
              userId: 'u-suv',
              displayName: 'SUV Driver',
              firstName: 'SUV',
              lastName: 'Driver',
              ratingAverage: 4.9,
              drivingExperienceYears: 5,
              primaryServiceArea: 'Bangalore',
              dailyHireRate: 2000,
              weeklyRate: null,
              monthlyRate: null,
              vehicleCapabilities: [{ vehicleCategoryId: 'vc-suv' }],
            },
            {
              id: 'driver-sedan',
              userId: 'u-sedan',
              displayName: 'Sedan Driver',
              firstName: 'Sedan',
              lastName: 'Driver',
              ratingAverage: 4.7,
              drivingExperienceYears: 3,
              primaryServiceArea: 'Bangalore',
              dailyHireRate: 1800,
              weeklyRate: null,
              monthlyRate: null,
              vehicleCapabilities: [{ vehicleCategoryId: 'vc-car' }],
            },
          ];
          if (!reqCap) return allDrivers;
          return allDrivers.filter((d) =>
            d.vehicleCapabilities.some((vc) => vc.vehicleCategoryId === reqCap),
          );
        },
      );
      mockPrisma.booking.findMany.mockResolvedValue([]);

      const start = new Date();
      const end = new Date(Date.now() + 86400000);

      const drivers = await listActiveDriversForHire(
        BookingType.DAILY,
        start,
        end,
        'vc-suv',
        mockPrisma as unknown as Db,
      );

      expect(mockPrisma.driverProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleCapabilities: {
              some: expect.objectContaining({ vehicleCategoryId: 'vc-suv' }),
            },
          }),
        }),
      );
      expect(drivers).toHaveLength(1);
      expect(drivers[0].driverProfileId).toBe('driver-suv');
    });
  });
});
