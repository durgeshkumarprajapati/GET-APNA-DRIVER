import 'server-only';
import { prisma } from '@/shared/database/prisma';
import { calculateHaversineDistance } from '@/modules/location/application/distance-service';
import { MarketplaceZoneStatus } from '@prisma/client';

export interface ZoneSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  status: MarketplaceZoneStatus;
}

export const UNZONED_FALLBACK: ZoneSummary = {
  id: 'unzoned',
  code: 'UNZONED',
  name: 'Unzoned Area',
  description: 'Rides or drivers outside designated urban zones',
  centerLatitude: 0,
  centerLongitude: 0,
  radiusMeters: 0,
  status: MarketplaceZoneStatus.ACTIVE,
};

/**
 * Server-authoritative zone classification.
 * Matches given coordinates against all active MarketplaceZone records via Haversine distance.
 * Returns closest matching zone within its radius, or UNZONED_FALLBACK if outside all zones.
 */
export async function resolveZoneForLocation(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): Promise<ZoneSummary> {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined ||
    isNaN(latitude) ||
    isNaN(longitude)
  ) {
    return UNZONED_FALLBACK;
  }

  const activeZones = await prisma.marketplaceZone.findMany({
    where: { status: MarketplaceZoneStatus.ACTIVE },
  });

  let closestZone: ZoneSummary | null = null;
  let minDistanceMeters = Infinity;

  for (const zone of activeZones) {
    try {
      const distance = calculateHaversineDistance(
        latitude,
        longitude,
        zone.centerLatitude,
        zone.centerLongitude,
      );

      if (distance <= zone.radiusMeters && distance < minDistanceMeters) {
        minDistanceMeters = distance;
        closestZone = {
          id: zone.id,
          code: zone.code,
          name: zone.name,
          description: zone.description,
          centerLatitude: zone.centerLatitude,
          centerLongitude: zone.centerLongitude,
          radiusMeters: zone.radiusMeters,
          status: zone.status,
        };
      }
    } catch {
      // Ignore coordinate calculation errors for invalid points
    }
  }

  return closestZone || UNZONED_FALLBACK;
}

export async function listMarketplaceZones(): Promise<ZoneSummary[]> {
  const zones = await prisma.marketplaceZone.findMany({
    orderBy: { name: 'asc' },
  });
  return zones.map((z) => ({
    id: z.id,
    code: z.code,
    name: z.name,
    description: z.description,
    centerLatitude: z.centerLatitude,
    centerLongitude: z.centerLongitude,
    radiusMeters: z.radiusMeters,
    status: z.status,
  }));
}

export async function getMarketplaceZoneById(zoneId: string): Promise<ZoneSummary | null> {
  if (zoneId === 'unzoned' || zoneId === 'UNZONED') {
    return UNZONED_FALLBACK;
  }

  const zone = await prisma.marketplaceZone.findUnique({
    where: { id: zoneId },
  });

  if (!zone) return null;

  return {
    id: zone.id,
    code: zone.code,
    name: zone.name,
    description: zone.description,
    centerLatitude: zone.centerLatitude,
    centerLongitude: zone.centerLongitude,
    radiusMeters: zone.radiusMeters,
    status: zone.status,
  };
}
