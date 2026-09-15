// Mock Prisma
jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    marketplaceZone: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '@/shared/database/prisma';
import {
  resolveZoneForLocation,
} from '@/modules/marketplace-intelligence/domain/zone-service';
import { MarketplaceZoneStatus } from '@prisma/client';

describe('Marketplace Zone Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve closest zone within radius meters', async () => {
    (prisma.marketplaceZone.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'zone-airport',
        code: 'AIRPORT_HUB',
        name: 'Airport Zone',
        description: 'Airport terminal',
        centerLatitude: 19.0896,
        centerLongitude: 72.8656,
        radiusMeters: 5000,
        status: MarketplaceZoneStatus.ACTIVE,
      },
    ]);

    // Pickup near airport (distance ~100m)
    const result = await resolveZoneForLocation(19.0890, 72.8650);

    expect(result.id).toBe('zone-airport');
    expect(result.code).toBe('AIRPORT_HUB');
  });

  it('should return UNZONED_FALLBACK when location is outside all zone radii', async () => {
    (prisma.marketplaceZone.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'zone-airport',
        code: 'AIRPORT_HUB',
        name: 'Airport Zone',
        description: 'Airport terminal',
        centerLatitude: 19.0896,
        centerLongitude: 72.8656,
        radiusMeters: 1000,
        status: MarketplaceZoneStatus.ACTIVE,
      },
    ]);

    // Location far away (e.g. Pune coordinates)
    const result = await resolveZoneForLocation(18.5204, 73.8567);

    expect(result.id).toBe('unzoned');
    expect(result.code).toBe('UNZONED');
  });

  it('should return UNZONED_FALLBACK when coordinates are null or undefined', async () => {
    const result = await resolveZoneForLocation(null, undefined);
    expect(result.id).toBe('unzoned');
  });
});
