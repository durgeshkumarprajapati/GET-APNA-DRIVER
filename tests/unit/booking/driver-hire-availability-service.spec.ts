import { BookingType } from '@prisma/client';

jest.mock('@/modules/location/application/nearby-driver-service', () => ({
  findNearbyDrivers: jest.fn(),
}));

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverVehicleCapability: { findMany: jest.fn() },
    booking: { findMany: jest.fn() },
  },
}));

import { listAvailableDriversForImmediateBooking } from '@/modules/booking/application/driver-hire-availability-service';
import { findNearbyDrivers } from '@/modules/location/application/nearby-driver-service';
import { prisma } from '@/shared/database/prisma';

describe('listAvailableDriversForImmediateBooking', () => {
  const mockFindNearby = findNearbyDrivers as jest.Mock;
  const mockFindManyCapability = prisma.driverVehicleCapability.findMany as jest.Mock;
  const mockFindManyBooking = prisma.booking.findMany as jest.Mock;

  const nearbyCandidates = [
    {
      driverId: 'dp-1',
      displayName: 'Rajesh Kumar',
      profileImageUrl: null,
      drivingExperienceYears: 5,
      primaryServiceArea: 'South Delhi',
      location: { latitude: 28.6, longitude: 77.2 },
      distanceMeters: 1200,
      distanceFormatted: '1.2 km',
    },
    {
      driverId: 'dp-2',
      displayName: 'Suresh Singh',
      profileImageUrl: null,
      drivingExperienceYears: 3,
      primaryServiceArea: 'South Delhi',
      location: { latitude: 28.61, longitude: 77.21 },
      distanceMeters: 2500,
      distanceFormatted: '2.5 km',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindManyBooking.mockResolvedValue([]);
  });

  it('returns an empty list for a booking type other than POINT_TO_POINT/HOURLY', async () => {
    const result = await listAvailableDriversForImmediateBooking(BookingType.DAILY, {
      latitude: 28.6,
      longitude: 77.2,
    });

    expect(result).toEqual([]);
    expect(mockFindNearby).not.toHaveBeenCalled();
  });

  it('lists every nearby available driver for a POINT_TO_POINT booking with no dropoff, no conflicts', async () => {
    mockFindNearby.mockResolvedValue(nearbyCandidates);

    const result = await listAvailableDriversForImmediateBooking(BookingType.POINT_TO_POINT, {
      latitude: 28.6,
      longitude: 77.2,
    });

    expect(mockFindNearby).toHaveBeenCalledWith(
      { latitude: 28.6, longitude: 77.2, radiusMeters: undefined },
      prisma,
    );
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.driverProfileId)).toEqual(['dp-1', 'dp-2']);
  });

  it('excludes a nearby driver currently mid-trip on another active booking', async () => {
    mockFindNearby.mockResolvedValue(nearbyCandidates);
    // dp-1 is mid-trip right now (started 5 min ago, ~30 min estimated).
    mockFindManyBooking.mockResolvedValue([
      {
        driverProfileId: 'dp-1',
        bookingType: BookingType.POINT_TO_POINT,
        requestedStartTime: new Date(Date.now() - 5 * 60 * 1000),
        requestedAt: new Date(Date.now() - 6 * 60 * 1000),
        hireStartAt: null,
        hireEndAt: null,
        estimatedDurationMinutes: 30,
        hireDurationMinutes: null,
      },
    ]);

    const result = await listAvailableDriversForImmediateBooking(BookingType.POINT_TO_POINT, {
      latitude: 28.6,
      longitude: 77.2,
    });

    expect(result.map((d) => d.driverProfileId)).toEqual(['dp-2']);
  });

  it('filters by vehicle category when provided', async () => {
    mockFindNearby.mockResolvedValue(nearbyCandidates);
    mockFindManyCapability.mockResolvedValue([{ driverProfileId: 'dp-2' }]);

    const result = await listAvailableDriversForImmediateBooking(
      BookingType.POINT_TO_POINT,
      { latitude: 28.6, longitude: 77.2 },
      'vc-suv',
    );

    expect(mockFindManyCapability).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          driverProfileId: { in: ['dp-1', 'dp-2'] },
          vehicleCategoryId: 'vc-suv',
          vehicleCategory: { isActive: true },
        }),
      }),
    );
    expect(result.map((d) => d.driverProfileId)).toEqual(['dp-2']);
  });

  it('for an HOURLY booking, excludes a driver already committed to an overlapping future hire window', async () => {
    mockFindNearby.mockResolvedValue(nearbyCandidates);
    mockFindManyBooking.mockResolvedValue([
      {
        driverProfileId: 'dp-1',
        bookingType: BookingType.HOURLY,
        requestedStartTime: null,
        requestedAt: new Date(),
        hireStartAt: new Date(Date.now() + 30 * 60 * 1000),
        hireEndAt: new Date(Date.now() + 90 * 60 * 1000),
        estimatedDurationMinutes: null,
        hireDurationMinutes: 60,
      },
    ]);

    // Requested HOURLY hire runs for 120 minutes starting now, so it
    // overlaps dp-1's existing 30-90 minute-from-now commitment.
    const result = await listAvailableDriversForImmediateBooking(
      BookingType.HOURLY,
      { latitude: 28.6, longitude: 77.2 },
      undefined,
      120,
    );

    expect(result.map((d) => d.driverProfileId)).toEqual(['dp-2']);
  });

  it('returns an empty list when there are no nearby drivers at all', async () => {
    mockFindNearby.mockResolvedValue([]);

    const result = await listAvailableDriversForImmediateBooking(BookingType.POINT_TO_POINT, {
      latitude: 28.6,
      longitude: 77.2,
    });

    expect(result).toEqual([]);
  });
});
