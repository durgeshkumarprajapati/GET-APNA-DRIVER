import type { Db } from '@/shared/database/prisma';
import { calculateHaversineDistance } from '@/modules/location/application/distance-service';
import { getMarketplaceZoneCoverage } from '@/modules/location/application/marketplace-zone-service';

type MockDb = Partial<Db> & Record<string, unknown>;

const DELHI_ZONE = {
  id: 'zone-delhi',
  code: 'DELHI_CENTRAL',
  name: 'Delhi Central Marketplace Zone',
  centerLatitude: 28.6139,
  centerLongitude: 77.209,
  radiusMeters: 5000,
  status: 'ACTIVE',
};

describe('Phase 94 — Local Marketplace Expansion & Discovery', () => {
  it('calculates accurate Haversine distance in meters between coordinates', () => {
    // Distance between Connaught Place (28.6315, 77.2167) and India Gate (28.6129, 77.2295)
    const distanceMeters = calculateHaversineDistance(28.6315, 77.2167, 28.6129, 77.2295);

    expect(distanceMeters).toBeGreaterThan(2000);
    expect(distanceMeters).toBeLessThan(2500);
  });

  it('evaluates zone coverage, real zone-scoped driver supply, and ETA estimates', async () => {
    const mockDb: MockDb = {
      marketplaceZone: {
        findMany: jest.fn().mockResolvedValue([DELHI_ZONE]),
      } as unknown as Db['marketplaceZone'],
      driverProfile: {
        findMany: jest.fn().mockResolvedValue([
          // Within the zone radius — counted
          { currentLocation: { latitude: 28.615, longitude: 77.21 } },
          { currentLocation: { latitude: 28.62, longitude: 77.2 } },
          // Far outside the zone radius (Mumbai) — not counted
          { currentLocation: { latitude: 19.076, longitude: 72.8777 } },
          // No location ping at all — not counted
          { currentLocation: null },
        ]),
      } as unknown as Db['driverProfile'],
      booking: {
        findMany: jest.fn().mockResolvedValue([
          { pickupLatitude: 28.614, pickupLongitude: 77.208 },
          { pickupLatitude: 19.076, pickupLongitude: 72.8777 },
        ]),
      } as unknown as Db['booking'],
    };

    const coverage = await getMarketplaceZoneCoverage(28.6139, 77.209, mockDb as Db);

    expect(coverage.isCovered).toBe(true);
    expect(coverage.zoneCode).toBe('DELHI_CENTRAL');
    expect(coverage.estimatedDriverArrivalMins).toBeLessThanOrEqual(15);
    // Only the 2 drivers actually within the zone radius, never a floor of 5.
    expect(coverage.activeDriverSupplyCount).toBe(2);
    // Only the 1 booking actually within the zone radius.
    expect(coverage.openBookingDemandCount).toBe(1);
  });

  it('reports zero supply honestly instead of flooring it at a fabricated minimum', async () => {
    const mockDb: MockDb = {
      marketplaceZone: {
        findMany: jest.fn().mockResolvedValue([DELHI_ZONE]),
      } as unknown as Db['marketplaceZone'],
      driverProfile: {
        findMany: jest.fn().mockResolvedValue([]),
      } as unknown as Db['driverProfile'],
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
      } as unknown as Db['booking'],
    };

    const coverage = await getMarketplaceZoneCoverage(28.6139, 77.209, mockDb as Db);

    expect(coverage.activeDriverSupplyCount).toBe(0);
    expect(coverage.openBookingDemandCount).toBe(0);
  });

  it('skips a zone row with corrupt coordinates instead of crashing the request', async () => {
    const mockDb: MockDb = {
      marketplaceZone: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              ...DELHI_ZONE,
              id: 'zone-corrupt',
              code: 'CORRUPT',
              centerLatitude: 999,
              centerLongitude: 999,
            },
            DELHI_ZONE,
          ]),
      } as unknown as Db['marketplaceZone'],
      driverProfile: {
        findMany: jest.fn().mockResolvedValue([]),
      } as unknown as Db['driverProfile'],
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
      } as unknown as Db['booking'],
    };

    const coverage = await getMarketplaceZoneCoverage(28.6139, 77.209, mockDb as Db);

    expect(coverage.zoneCode).toBe('DELHI_CENTRAL');
  });
});
