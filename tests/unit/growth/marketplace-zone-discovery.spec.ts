import {
  calculateHaversineDistanceMeters,
  getMarketplaceZoneCoverage,
} from '@/modules/location/application/marketplace-zone-service';

describe('Phase 94 — Local Marketplace Expansion & Discovery', () => {
  it('calculates accurate Haversine distance in meters between coordinates', () => {
    // Distance between Connaught Place (28.6315, 77.2167) and India Gate (28.6129, 77.2295)
    const distanceMeters = calculateHaversineDistanceMeters(28.6315, 77.2167, 28.6129, 77.2295);

    expect(distanceMeters).toBeGreaterThan(2000);
    expect(distanceMeters).toBeLessThan(2500);
  });

  it('evaluates zone coverage, driver supply, and ETA estimates', async () => {
    const mockDb: any = {
      marketplaceZone: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'zone-delhi',
            code: 'DELHI_CENTRAL',
            name: 'Delhi Central Marketplace Zone',
            centerLatitude: 28.6139,
            centerLongitude: 77.209,
            radiusMeters: 5000,
            status: 'ACTIVE',
          },
        ]),
      },
      driverProfile: {
        count: jest.fn().mockResolvedValue(15),
      },
      booking: {
        count: jest.fn().mockResolvedValue(3),
      },
    };

    const coverage = await getMarketplaceZoneCoverage(28.6139, 77.209, mockDb);

    expect(coverage.isCovered).toBe(true);
    expect(coverage.zoneCode).toBe('DELHI_CENTRAL');
    expect(coverage.estimatedDriverArrivalMins).toBeLessThanOrEqual(15);
    expect(coverage.activeDriverSupplyCount).toBe(15);
  });
});
