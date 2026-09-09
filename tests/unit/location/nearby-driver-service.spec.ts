import { findNearbyDrivers } from '@/modules/location/application/nearby-driver-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverCurrentLocation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/shared/redis/client', () => ({
  redis: {
    call: jest.fn(),
    get: jest.fn(),
    zrem: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: jest.fn().mockImplementation((key: string, defaultValue: number) => {
    if (key === 'location.driver.default_search_radius_meters') return Promise.resolve(5000);
    if (key === 'location.driver.maximum_search_radius_meters') return Promise.resolve(20000);
    if (key === 'location.driver.stale_after_seconds') return Promise.resolve(60);
    return Promise.resolve(defaultValue);
  }),
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibilityFromProfile: jest.fn(),
}));

import { prisma } from '@/shared/database/prisma';
import { redis } from '@/shared/redis/client';
import { evaluateDriverEligibilityFromProfile } from '@/modules/driver/application/services/driver-eligibility-service';

describe('NearbyDriverService', () => {
  const mockFindMany = prisma.driverCurrentLocation.findMany as jest.Mock;
  const mockFindUniqueLocation = prisma.driverCurrentLocation.findUnique as jest.Mock;
  const mockFindUniqueProfile = prisma.driverProfile.findUnique as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('discovers nearby drivers via Redis GEO fast path and returns customer-sanitized portfolio', async () => {
    // Redis GEO returns candidate 'dp-1' at distance 1200 meters
    (redis.call as jest.Mock).mockResolvedValue([['dp-1', '1200']]);
    (redis.get as jest.Mock).mockResolvedValue(
      JSON.stringify({
        latitude: 28.62,
        longitude: 77.21,
        capturedAt: new Date().toISOString(),
      }),
    );
    (evaluateDriverEligibilityFromProfile as jest.Mock).mockResolvedValue({
      isEligible: true,
      reasons: [],
    });

    mockFindUniqueProfile.mockResolvedValue({
      id: 'dp-1',
      displayName: 'Rajesh Kumar',
      profileImageUrl: 'https://cdn.example.com/rajesh.jpg',
      drivingExperienceYears: 6,
      primaryServiceArea: 'Central Delhi',
      availabilityStatus: 'AVAILABLE',
      user: { fullName: 'Rajesh Kumar' },
    });

    const results = await findNearbyDrivers({
      latitude: 28.6139,
      longitude: 77.209,
      radiusMeters: 5000,
    });

    expect(results).toHaveLength(1);
    expect(results[0].driverId).toBe('dp-1');
    expect(results[0].displayName).toBe('Rajesh Kumar');
    expect(results[0].distanceFormatted).toBe('1.2 km');
    // Ensure no sensitive documents or identity numbers exposed
    expect(results[0]).not.toHaveProperty('aadhaarCard');
    expect(results[0]).not.toHaveProperty('drivingLicenseNumber');
  });

  it('falls back to PostgreSQL + PostGIS if Redis returns no candidates', async () => {
    (redis.call as jest.Mock).mockResolvedValue([]); // Redis empty
    (evaluateDriverEligibilityFromProfile as jest.Mock).mockResolvedValue({
      isEligible: true,
      reasons: [],
    });

    mockFindMany.mockResolvedValue([
      {
        driverProfileId: 'dp-2',
        latitude: 28.615,
        longitude: 77.21,
        capturedAt: new Date(),
      },
    ]);

    mockFindUniqueLocation.mockResolvedValue({
      latitude: 28.615,
      longitude: 77.21,
      capturedAt: new Date(),
    });

    mockFindUniqueProfile.mockResolvedValue({
      id: 'dp-2',
      displayName: 'Suresh Sharma',
      profileImageUrl: null,
      drivingExperienceYears: 4,
      primaryServiceArea: 'North Delhi',
      availabilityStatus: 'AVAILABLE',
      user: { fullName: 'Suresh Sharma' },
    });

    const results = await findNearbyDrivers({ latitude: 28.6139, longitude: 77.209 });

    expect(results).toHaveLength(1);
    expect(results[0].driverId).toBe('dp-2');
  });

  it('excludes stale driver locations and purges them from Redis', async () => {
    (redis.call as jest.Mock).mockResolvedValue([['dp-stale', '800']]);
    const staleTime = new Date(Date.now() - 120000).toISOString(); // 120s ago (stale after 60s)
    (redis.get as jest.Mock).mockResolvedValue(
      JSON.stringify({
        latitude: 28.62,
        longitude: 77.21,
        capturedAt: staleTime,
      }),
    );

    const results = await findNearbyDrivers({ latitude: 28.6139, longitude: 77.209 });

    expect(results).toHaveLength(0);
    expect(redis.zrem).toHaveBeenCalledWith('driver:geo:available', 'dp-stale');
  });

  it('excludes ineligible drivers', async () => {
    (redis.call as jest.Mock).mockResolvedValue([['dp-ineligible', '500']]);
    (redis.get as jest.Mock).mockResolvedValue(
      JSON.stringify({
        latitude: 28.62,
        longitude: 77.21,
        capturedAt: new Date().toISOString(),
      }),
    );
    (evaluateDriverEligibilityFromProfile as jest.Mock).mockResolvedValue({
      isEligible: false,
      reasons: ['Suspended driver account.'],
    });

    const results = await findNearbyDrivers({ latitude: 28.6139, longitude: 77.209 });

    expect(results).toHaveLength(0);
    expect(redis.zrem).toHaveBeenCalledWith('driver:geo:available', 'dp-ineligible');
  });
});
