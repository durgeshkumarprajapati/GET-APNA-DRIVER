import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  MarketplaceZoneCoverage,
  CreateMarketplaceZoneInput,
  ZoneAnalyticsDTO,
} from '../domain/marketplace-zone-types';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { calculateHaversineDistance } from './distance-service';

/**
 * Evaluates zone-based service availability, vehicle categories, and driver arrival ETA.
 */
export async function getMarketplaceZoneCoverage(
  latitude: number,
  longitude: number,
  db: Db = prisma,
): Promise<MarketplaceZoneCoverage> {
  const activeZones = await db.marketplaceZone.findMany({
    where: { status: 'ACTIVE' },
  });

  if (activeZones.length === 0) {
    return {
      zoneId: 'default-delhi-ncr',
      zoneCode: 'DELHI_NCR',
      zoneName: 'Delhi NCR Central Zone',
      status: 'ACTIVE',
      centerLatitude: latitude,
      centerLongitude: longitude,
      radiusMeters: 10000,
      isCovered: true,
      distanceFromCenterMeters: 0,
      availableVehicleCategories: ['HATCHBACK', 'SEDAN', 'SUV', 'LUXURY'],
      estimatedDriverArrivalMins: 5,
      activeDriverSupplyCount: 25,
      openBookingDemandCount: 4,
    };
  }

  // Find closest matching zone. A zone row with corrupt stored coordinates
  // is skipped rather than letting it crash this public, unauthenticated
  // request for every caller.
  let closestZone = activeZones[0];
  let minDistance = Infinity;
  for (const zone of activeZones) {
    try {
      const dist = calculateHaversineDistance(
        latitude,
        longitude,
        zone.centerLatitude,
        zone.centerLongitude,
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestZone = zone;
      }
    } catch {
      // Skip zones with invalid stored coordinates
    }
  }

  const isCovered = minDistance <= closestZone.radiusMeters;

  // Real, zone-scoped driver supply and open-booking demand. A prior
  // version counted ALL platform-wide available drivers and ALL open
  // bookings regardless of distance from the queried point — every zone in
  // the country reported the same numbers — then floored the driver count
  // at a fabricated minimum of 5 even when the true nearby count was lower
  // or zero.
  //
  // This intentionally does not call marketplace-intelligence's
  // getSupplyMetrics/getDemandMetrics: those hardcode the global prisma
  // client (this file's db param exists specifically so callers/tests can
  // inject a fake one) and getSupplyMetrics additionally runs a dispatch-
  // eligibility check per driver platform-wide — too expensive to repeat on
  // every call to this unauthenticated, likely high-traffic endpoint.
  const [driverLocations, openBookings] = await Promise.all([
    db.driverProfile.findMany({
      where: { availabilityStatus: 'AVAILABLE', approvalStatus: 'APPROVED' },
      select: { currentLocation: { select: { latitude: true, longitude: true } } },
    }),
    db.booking.findMany({
      where: { status: { in: ['DRAFT', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED'] } },
      select: { pickupLatitude: true, pickupLongitude: true },
    }),
  ]);

  const isWithinClosestZone = (lat: number, lon: number): boolean => {
    try {
      return (
        calculateHaversineDistance(
          lat,
          lon,
          closestZone.centerLatitude,
          closestZone.centerLongitude,
        ) <= closestZone.radiusMeters
      );
    } catch {
      return false;
    }
  };

  const activeDriverSupplyCount = driverLocations.filter(
    (d) =>
      d.currentLocation &&
      isWithinClosestZone(d.currentLocation.latitude, d.currentLocation.longitude),
  ).length;

  const openBookingDemandCount = openBookings.filter((b) =>
    isWithinClosestZone(b.pickupLatitude, b.pickupLongitude),
  ).length;

  const estimatedDriverArrivalMins = isCovered
    ? Math.max(3, Math.min(15, Math.round(minDistance / 500) + 4))
    : 20;

  return {
    zoneId: closestZone.id,
    zoneCode: closestZone.code,
    zoneName: closestZone.name,
    status: 'ACTIVE',
    centerLatitude: closestZone.centerLatitude,
    centerLongitude: closestZone.centerLongitude,
    radiusMeters: closestZone.radiusMeters,
    isCovered,
    distanceFromCenterMeters: minDistance,
    availableVehicleCategories: ['HATCHBACK', 'SEDAN', 'SUV', 'LUXURY'],
    estimatedDriverArrivalMins,
    activeDriverSupplyCount,
    openBookingDemandCount,
  };
}

/**
 * Admin tool: launches or updates a service zone.
 */
export async function createOrUpdateMarketplaceZone(
  input: CreateMarketplaceZoneInput,
  actorUserId: string,
  db: Db = prisma,
) {
  const code = input.code.trim().toUpperCase();

  const zone = await db.marketplaceZone.upsert({
    where: { code },
    create: {
      code,
      name: input.name,
      description: input.description,
      centerLatitude: input.centerLatitude,
      centerLongitude: input.centerLongitude,
      radiusMeters: input.radiusMeters,
      status: input.status ?? 'ACTIVE',
    },
    update: {
      name: input.name,
      ...(input.description !== undefined && { description: input.description }),
      centerLatitude: input.centerLatitude,
      centerLongitude: input.centerLongitude,
      radiusMeters: input.radiusMeters,
      ...(input.status !== undefined && { status: input.status }),
    },
  });

  await recordAuditLog(db, {
    actorUserId,
    action: 'marketplace.zone_saved',
    entityType: 'MarketplaceZone',
    entityId: zone.id,
    afterState: {
      code: zone.code,
      name: zone.name,
      status: zone.status,
      radiusMeters: zone.radiusMeters,
    },
  });

  return zone;
}

/**
 * Admin tool: lists all service zones with demand-supply analytics.
 */
export async function listMarketplaceZonesWithAnalytics(
  db: Db = prisma,
): Promise<ZoneAnalyticsDTO[]> {
  const zones = await db.marketplaceZone.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const [activeDriversCount, activeBookingsCount] = await Promise.all([
    db.driverProfile.count({ where: { availabilityStatus: 'AVAILABLE' } }),
    db.booking.count({
      where: {
        status: { in: ['DRAFT', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'TRIP_IN_PROGRESS'] },
      },
    }),
  ]);

  return zones.map((z) => {
    const demandSupplyRatio =
      activeDriversCount > 0 ? Number((activeBookingsCount / activeDriversCount).toFixed(2)) : 0;
    return {
      zoneId: z.id,
      code: z.code,
      name: z.name,
      activeDriversCount,
      activeBookingsCount,
      demandSupplyRatio,
      status: z.status,
    };
  });
}
