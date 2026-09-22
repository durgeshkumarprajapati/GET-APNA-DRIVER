import { BookingType, Prisma } from '@prisma/client';
import { requiresDropLocation } from '@/modules/booking/domain/booking-policy';
import { createBookingSchema } from '@/modules/booking/domain/booking-validation-schemas';
import { rankCandidateDrivers } from '@/modules/dispatch/application/candidate-ranking-service';
import { listActiveDriversForHire } from '@/modules/booking/application/driver-hire-availability-service';

const mockTx = {
  driverProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  driverVehicleCapability: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  driverScheduleSlot: {
    findMany: jest.fn(),
  },
  driverScheduleException: {
    findMany: jest.fn(),
  },
  driverCurrentLocation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  booking: {
    findMany: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
    driverProfile: {
      findUnique: (...args: unknown[]) => mockTx.driverProfile.findUnique(...args),
      findMany: (...args: unknown[]) => mockTx.driverProfile.findMany(...args),
    },
    driverVehicleCapability: {
      count: (...args: unknown[]) => mockTx.driverVehicleCapability.count(...args),
      findMany: (...args: unknown[]) => mockTx.driverVehicleCapability.findMany(...args),
    },
    driverScheduleSlot: {
      findMany: (...args: unknown[]) => mockTx.driverScheduleSlot.findMany(...args),
    },
    driverScheduleException: {
      findMany: (...args: unknown[]) => mockTx.driverScheduleException.findMany(...args),
    },
    driverCurrentLocation: {
      findUnique: (...args: unknown[]) => mockTx.driverCurrentLocation.findUnique(...args),
      findMany: (...args: unknown[]) => mockTx.driverCurrentLocation.findMany(...args),
    },
    booking: {
      findMany: (...args: unknown[]) => mockTx.booking.findMany(...args),
    },
  },
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({ isEligible: true }),
}));

describe('Phase 69: Pickup-Only Booking & Driver Discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Booking Policy & Schema Validation', () => {
    it('confirms requiresDropLocation returns false for ALL booking types', () => {
      const allBookingTypes = Object.values(BookingType);
      expect(allBookingTypes.length).toBeGreaterThan(0);

      allBookingTypes.forEach((type) => {
        expect(requiresDropLocation(type)).toBe(false);
      });
    });

    it('allows valid booking payload with ONLY pickup location and NO drop location for ONE_WAY', () => {
      const payload = {
        bookingType: BookingType.ONE_WAY,
        pickupLocation: {
          latitude: 28.6139,
          longitude: 77.209,
          address: 'Connaught Place, New Delhi',
        },
      };

      const result = createBookingSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dropoffLocation).toBeUndefined();
      }
    });

    it('allows valid booking payload with ONLY pickup location for HOURLY driver hire', () => {
      const payload = {
        bookingType: BookingType.HOURLY,
        pickupLocation: {
          latitude: 19.076,
          longitude: 72.8777,
          address: 'Bandra West, Mumbai',
        },
        hourlyPackageHours: 4,
      };

      const result = createBookingSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('allows valid booking payload with ONLY pickup location for DAILY driver hire', () => {
      const payload = {
        bookingType: BookingType.DAILY,
        pickupLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
          address: 'MG Road, Bengaluru',
        },
        numberOfDays: 2,
      };

      const result = createBookingSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('allows valid booking payload with ONLY pickup location for MONTHLY driver hire', () => {
      const payload = {
        bookingType: BookingType.MONTHLY,
        pickupLocation: {
          latitude: 13.0827,
          longitude: 80.2707,
          address: 'Anna Salai, Chennai',
        },
        numberOfDays: 30,
      };

      const result = createBookingSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('normalizes dropoffLocation to null for driver hire modes even if sent', () => {
      const payload = {
        bookingType: BookingType.DAILY,
        pickupLocation: {
          latitude: 28.6139,
          longitude: 77.209,
          address: 'Pickup Address',
        },
        dropoffLocation: {
          latitude: 28.7041,
          longitude: 77.1025,
          address: 'Drop Address',
        },
        numberOfDays: 1,
      };

      const result = createBookingSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dropoffLocation).toBeNull();
      }
    });
  });

  describe('2. Driver Discovery & Vehicle Capability Filtering', () => {
    it('ranks candidate drivers based on pickup location and enforces vehicle capability filtering', async () => {
      const candidates = [
        {
          driverProfileId: 'driver-suv-only',
          displayName: 'SUV Driver',
          capturedAt: new Date(),
          accuracy: 10,
          latitude: 28.615,
          longitude: 77.21,
          availabilityStatus: 'AVAILABLE' as const,
        },
        {
          driverProfileId: 'driver-mini-only',
          displayName: 'Mini Driver',
          capturedAt: new Date(),
          accuracy: 10,
          latitude: 28.616,
          longitude: 77.211,
          availabilityStatus: 'AVAILABLE' as const,
        },
      ];

      mockTx.driverVehicleCapability.count.mockImplementation(
        (args?: { where?: { driverProfileId?: string; vehicleCategoryId?: string } }) => {
          if (
            args?.where?.driverProfileId === 'driver-suv-only' &&
            args?.where?.vehicleCategoryId === 'cat-suv'
          ) {
            return Promise.resolve(1);
          }
          return Promise.resolve(0);
        },
      );

      const ranked = await rankCandidateDrivers(candidates, {
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        requestedVehicleCategory: 'cat-suv',
      });

      expect(ranked).toHaveLength(1);
      expect(ranked[0].driverProfileId).toBe('driver-suv-only');
    });

    it('lists available drivers for hire matching vehicle category and non-conflicting schedules', async () => {
      const now = new Date();
      const hireEndAt = new Date(now.getTime() + 86400000);

      mockTx.driverVehicleCapability.findMany.mockResolvedValue([
        { driverProfileId: 'driver-suv-only' },
      ]);

      mockTx.driverProfile.findMany.mockResolvedValue([
        {
          id: 'driver-suv-only',
          displayName: 'Rajesh Driver',
          firstName: 'Rajesh',
          lastName: 'Kumar',
          ratingAverage: 4.9,
          drivingExperienceYears: 8,
          primaryServiceArea: 'New Delhi',
          dailyHireRate: new Prisma.Decimal(1500),
          availabilityStatus: 'AVAILABLE',
          isApproved: true,
          isActive: true,
        },
      ]);

      mockTx.booking.findMany.mockResolvedValue([]);
      mockTx.driverScheduleException.findMany.mockResolvedValue([]);

      const drivers = await listActiveDriversForHire(BookingType.DAILY, now, hireEndAt, 'cat-suv');

      expect(drivers).toHaveLength(1);
      expect(drivers[0].driverProfileId).toBe('driver-suv-only');
      expect(drivers[0].rate).toBe('1500');
    });
  });
});
