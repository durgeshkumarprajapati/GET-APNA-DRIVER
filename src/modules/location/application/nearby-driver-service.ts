import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { redis } from '@/shared/redis/client';
import { getInteger } from '@/shared/config/configuration-service';
import { calculateHaversineDistance, toKmDisplay, validateCoordinates } from './distance-service';
import { evaluateDriverEligibilityFromProfile } from '@/modules/driver/application/services/driver-eligibility-service';

export interface FindNearbyDriversInput {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}

export interface CustomerVisibleDriverPortfolio {
  driverId: string;
  displayName: string;
  profileImageUrl: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  distanceMeters: number;
  distanceFormatted: string;
}

/**
 * Discovers nearby eligible and available drivers using Redis GEO fast-path with PostGIS fallback.
 * Strictly sanitizes output to exclude private credentials, documents, and identity numbers.
 */
export async function findNearbyDrivers(
  input: FindNearbyDriversInput,
  db: Db = prisma,
): Promise<CustomerVisibleDriverPortfolio[]> {
  validateCoordinates(input.latitude, input.longitude);

  const defaultRadius = await getInteger('location.driver.default_search_radius_meters', 5000, db);
  const maxRadius = await getInteger('location.driver.maximum_search_radius_meters', 20000, db);
  const staleAfterSeconds = await getInteger('location.driver.stale_after_seconds', 60, db);

  const requestedRadius = input.radiusMeters ?? defaultRadius;
  const searchRadius = Math.max(100, Math.min(requestedRadius, maxRadius));

  let candidates: { driverProfileId: string; distanceMeters: number }[] = [];

  // 1. Redis GEO Search Fast Path
  try {
    const redisResults = (await redis.call(
      'GEOSEARCH',
      'driver:geo:available',
      'FROMLONLAT',
      input.longitude.toString(),
      input.latitude.toString(),
      'BYRADIUS',
      searchRadius.toString(),
      'm',
      'WITHDIST',
      'ASC',
    )) as unknown as [string, string][];

    if (Array.isArray(redisResults) && redisResults.length > 0) {
      candidates = redisResults.map(([id, distStr]) => ({
        driverProfileId: id,
        distanceMeters: Math.round(parseFloat(distStr)),
      }));
    }
  } catch {
    // Redis failed or unavailable; fall through to PostgreSQL PostGIS fallback
  }

  // 2. PostgreSQL + PostGIS Fallback Search (if Redis yielded no candidates)
  if (candidates.length === 0) {
    const dbLocations = await db.driverCurrentLocation.findMany({
      where: {
        driverProfile: {
          availabilityStatus: 'AVAILABLE',
          approvalStatus: 'APPROVED',
          user: { accountStatus: 'ACTIVE' },
        },
      },
      select: {
        driverProfileId: true,
        latitude: true,
        longitude: true,
        capturedAt: true,
      },
    });

    const now = Date.now();
    for (const loc of dbLocations) {
      if (now - loc.capturedAt.getTime() > staleAfterSeconds * 1000) continue;

      const dist = calculateHaversineDistance(
        input.latitude,
        input.longitude,
        loc.latitude,
        loc.longitude,
      );

      if (dist <= searchRadius) {
        candidates.push({
          driverProfileId: loc.driverProfileId,
          distanceMeters: dist,
        });
      }
    }

    candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  if (candidates.length === 0) {
    return [];
  }

  // 3. Candidate Freshness, Eligibility & Portfolio Assembly
  const nearbyDrivers: CustomerVisibleDriverPortfolio[] = [];
  const now = Date.now();

  for (const candidate of candidates) {
    // Fetch last location timestamp & metadata
    let locMeta: { latitude: number; longitude: number; capturedAt: string } | null = null;

    try {
      const metaStr = await redis.get(`driver:last-location:${candidate.driverProfileId}`);
      if (metaStr) {
        locMeta = JSON.parse(metaStr);
      }
    } catch {
      // Ignore redis cache miss
    }

    if (!locMeta) {
      const dbLoc = await db.driverCurrentLocation.findUnique({
        where: { driverProfileId: candidate.driverProfileId },
      });
      if (dbLoc) {
        locMeta = {
          latitude: dbLoc.latitude,
          longitude: dbLoc.longitude,
          capturedAt: dbLoc.capturedAt.toISOString(),
        };
      }
    }

    if (!locMeta) continue;

    // Check Freshness
    const capturedTime = new Date(locMeta.capturedAt).getTime();
    if (now - capturedTime > staleAfterSeconds * 1000) {
      // Purge stale driver from Redis index
      try {
        await redis.zrem('driver:geo:available', candidate.driverProfileId);
        await redis.del(`driver:last-location:${candidate.driverProfileId}`);
      } catch {
        // Ignore redis purge error
      }
      continue;
    }

    // Fetch the profile once — reused for both eligibility and the
    // portfolio assembly below (previously fetched twice: once inside
    // evaluateDriverEligibility, once again here).
    const profile = await db.driverProfile.findUnique({
      where: { id: candidate.driverProfileId },
      include: { user: true, documents: { where: { isCurrent: true } } },
    });

    if (!profile) continue;

    // Verify Eligibility
    const eligibility = await evaluateDriverEligibilityFromProfile(profile, db);
    if (!eligibility.isEligible) {
      try {
        await redis.zrem('driver:geo:available', candidate.driverProfileId);
      } catch {
        // Ignore redis purge error
      }
      continue;
    }

    if (profile.availabilityStatus !== 'AVAILABLE') continue;

    const displayName =
      profile.displayName ||
      (profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : 'Apna Driver');

    nearbyDrivers.push({
      driverId: profile.id,
      displayName,
      profileImageUrl: profile.profileImageUrl,
      drivingExperienceYears: profile.drivingExperienceYears,
      primaryServiceArea: profile.primaryServiceArea,
      location: {
        latitude: locMeta.latitude,
        longitude: locMeta.longitude,
      },
      distanceMeters: candidate.distanceMeters,
      distanceFormatted: toKmDisplay(candidate.distanceMeters),
    });
  }

  return nearbyDrivers;
}
