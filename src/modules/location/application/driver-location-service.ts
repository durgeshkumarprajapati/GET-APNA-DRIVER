import 'server-only';
import { LocationSource, type DriverCurrentLocation } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { redis } from '@/shared/redis/client';
import { getInteger } from '@/shared/config/configuration-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { validateCoordinates } from './distance-service';
import {
  AccuracyThresholdExceededError,
  LocationRateLimitError,
  LocationStaleError,
} from '../domain/errors';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import { DriverNotEligibleError } from '@/modules/driver/domain/errors';

export interface UpdateDriverLocationInput {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  source?: LocationSource;
  capturedAt?: Date | string | null;
}

export interface DriverLocationDetails {
  driverProfileId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  source: LocationSource;
  capturedAt: Date;
}

/**
 * Authoritatively processes, validates, rate-limits, and indexes live driver location updates across Redis and PostgreSQL.
 */
export async function updateDriverLocation(
  userId: string,
  input: UpdateDriverLocationInput,
  _requestMetadata?: Record<string, unknown> | null,
  db: Db = prisma,
): Promise<DriverCurrentLocation> {
  validateCoordinates(input.latitude, input.longitude);

  const profile = await getOrCreateDriverProfile(userId, db);

  // 1. Accuracy Validation
  const maxAccuracy = await getInteger('location.driver.max_accuracy_meters', 100, db);
  if (input.accuracy != null && input.accuracy > maxAccuracy) {
    throw new AccuracyThresholdExceededError(input.accuracy, maxAccuracy);
  }

  // 2. Minimum Update Interval Rate Limiting (per driver profile)
  const minIntervalSeconds = await getInteger('location.driver.update_min_interval_seconds', 5, db);
  const rateLimitKey = `driver:location:last-update:${profile.id}`;
  const now = Date.now();

  try {
    const lastUpdateStr = await redis.get(rateLimitKey);
    if (lastUpdateStr) {
      const elapsedSeconds = (now - parseInt(lastUpdateStr, 10)) / 1000;
      if (elapsedSeconds < minIntervalSeconds) {
        throw new LocationRateLimitError(minIntervalSeconds);
      }
    }
    await redis.set(rateLimitKey, now.toString(), 'EX', minIntervalSeconds * 2);
  } catch (err) {
    if (err instanceof LocationRateLimitError) throw err;
    // Fail-open for Redis transient errors
  }

  // 3. Stale Captured Timestamp Check
  const staleAfterSeconds = await getInteger('location.driver.stale_after_seconds', 60, db);
  const capturedAt = input.capturedAt ? new Date(input.capturedAt) : new Date();
  if (isNaN(capturedAt.getTime())) {
    throw new Error('Invalid capturedAt timestamp.');
  }

  if (now - capturedAt.getTime() > staleAfterSeconds * 1000) {
    throw new LocationStaleError(staleAfterSeconds);
  }

  // 4. Driver Eligibility & Availability Rules
  const eligibility = await evaluateDriverEligibility(profile.id, db);
  if (!eligibility.isEligible) {
    throw new DriverNotEligibleError(eligibility.reasons);
  }

  const isAvailable = profile.availabilityStatus === 'AVAILABLE';

  // 5. Update Redis Transient GEO Index & Metadata (if Available)
  if (isAvailable) {
    try {
      await redis.geoadd('driver:geo:available', input.longitude, input.latitude, profile.id);

      const locationMeta = {
        driverProfileId: profile.id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? null,
        heading: input.heading ?? null,
        speed: input.speed ?? null,
        capturedAt: capturedAt.toISOString(),
      };

      await redis.set(`driver:last-location:${profile.id}`, JSON.stringify(locationMeta));
      await redis.set(`driver:location:updated-at:${profile.id}`, capturedAt.getTime().toString());
    } catch {
      // Redis fallback handled gracefully
    }
  }

  // 6. PostgreSQL Authoritative Last Known Location Upsert
  const currentLocation = await db.driverCurrentLocation.upsert({
    where: { driverProfileId: profile.id },
    create: {
      driverProfileId: profile.id,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? null,
      heading: input.heading ?? null,
      speed: input.speed ?? null,
      source: input.source || LocationSource.BROWSER_GPS,
      capturedAt,
    },
    update: {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? null,
      heading: input.heading ?? null,
      speed: input.speed ?? null,
      source: input.source || LocationSource.BROWSER_GPS,
      capturedAt,
    },
  });

  // 7. Throttled History Telemetry Sampling
  const sampleMinInterval = await getInteger(
    'location.history.sample_min_interval_seconds',
    60,
    db,
  );
  const sampleKey = `driver:location:last-history-sample:${profile.id}`;

  try {
    const lastSampleStr = await redis.get(sampleKey);
    const shouldSample =
      !lastSampleStr || now - parseInt(lastSampleStr, 10) >= sampleMinInterval * 1000;

    if (shouldSample) {
      await db.driverLocationHistory.create({
        data: {
          driverProfileId: profile.id,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy ?? null,
          heading: input.heading ?? null,
          speed: input.speed ?? null,
          source: input.source || LocationSource.BROWSER_GPS,
          capturedAt,
        },
      });
      await redis.set(sampleKey, now.toString(), 'EX', sampleMinInterval * 3);
    }
  } catch {
    // Non-blocking history sampling failure
  }

  return currentLocation;
}

/**
 * Purges a driver from the Redis live available-driver index.
 */
export async function removeDriverFromLiveIndex(
  driverProfileId: string,
  db: Db = prisma,
): Promise<void> {
  try {
    await redis.zrem('driver:geo:available', driverProfileId);
    await redis.del(`driver:last-location:${driverProfileId}`);
    await redis.del(`driver:location:updated-at:${driverProfileId}`);
  } catch {
    // Ignore redis error
  }

  await insertOutboxEvent(db, {
    eventType: 'driver.availability.location_removed',
    aggregateType: 'DriverProfile',
    aggregateId: driverProfileId,
    payload: { driverProfileId, removedAt: new Date().toISOString() },
  });
}

/**
 * Indexes a driver in the Redis live available-driver index from PostgreSQL last known location.
 */
export async function addDriverToLiveIndex(
  driverProfileId: string,
  db: Db = prisma,
): Promise<void> {
  const currentLocation = await db.driverCurrentLocation.findUnique({
    where: { driverProfileId },
  });

  if (!currentLocation) return;

  try {
    await redis.geoadd(
      'driver:geo:available',
      currentLocation.longitude,
      currentLocation.latitude,
      driverProfileId,
    );

    const locationMeta = {
      driverProfileId,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      accuracy: currentLocation.accuracy,
      heading: currentLocation.heading,
      speed: currentLocation.speed,
      capturedAt: currentLocation.capturedAt.toISOString(),
    };

    await redis.set(`driver:last-location:${driverProfileId}`, JSON.stringify(locationMeta));
    await redis.set(
      `driver:location:updated-at:${driverProfileId}`,
      currentLocation.capturedAt.getTime().toString(),
    );
  } catch {
    // Ignore redis error
  }

  await insertOutboxEvent(db, {
    eventType: 'driver.availability.location_indexed',
    aggregateType: 'DriverProfile',
    aggregateId: driverProfileId,
    payload: {
      driverProfileId,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      indexedAt: new Date().toISOString(),
    },
  });
}
