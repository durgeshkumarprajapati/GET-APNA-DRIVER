import 'server-only';
import { calculateHaversineDistance } from '@/modules/location/application/distance-service';
import { redis } from '@/shared/redis/client';
import type {
  GeofenceDefinition,
  GeofenceEvaluationResult,
  GeofenceEventType,
  GeofenceStateRecord,
} from '../domain/geofence-types';

export async function evaluateGeofence(
  entityId: string,
  location: { latitude: number; longitude: number },
  geofence: GeofenceDefinition,
): Promise<GeofenceEvaluationResult> {
  const distanceToCenterMeters = calculateHaversineDistance(
    location.latitude,
    location.longitude,
    geofence.center.latitude,
    geofence.center.longitude,
  );

  const isInside = distanceToCenterMeters <= geofence.radiusMeters;
  const now = new Date().toISOString();
  const cacheKey = `geofence:state:${geofence.id}:${entityId}`;

  let eventType: GeofenceEventType | null = null;
  let dwellSeconds = 0;

  try {
    const previousRaw = await redis.get(cacheKey);
    const previousState: GeofenceStateRecord | null = previousRaw ? JSON.parse(previousRaw) : null;

    if (!previousState) {
      if (isInside) {
        eventType = 'GEOFENCE_ENTER';
        const newState: GeofenceStateRecord = {
          geofenceId: geofence.id,
          entityId,
          isInside: true,
          enteredAt: now,
          lastEvaluatedAt: now,
          dwellSeconds: 0,
        };
        await redis.set(cacheKey, JSON.stringify(newState), 'EX', 86400);
      }
    } else {
      if (!previousState.isInside && isInside) {
        eventType = 'GEOFENCE_ENTER';
        const newState: GeofenceStateRecord = {
          geofenceId: geofence.id,
          entityId,
          isInside: true,
          enteredAt: now,
          lastEvaluatedAt: now,
          dwellSeconds: 0,
        };
        await redis.set(cacheKey, JSON.stringify(newState), 'EX', 86400);
      } else if (previousState.isInside && !isInside) {
        eventType = 'GEOFENCE_EXIT';
        await redis.del(cacheKey);
      } else if (previousState.isInside && isInside) {
        const enteredTime = previousState.enteredAt
          ? new Date(previousState.enteredAt).getTime()
          : Date.now();
        dwellSeconds = Math.max(0, Math.floor((Date.now() - enteredTime) / 1000));

        const dwellThreshold = geofence.dwellThresholdSeconds ?? 180; // default 3 mins
        if (dwellSeconds >= dwellThreshold && previousState.dwellSeconds < dwellThreshold) {
          eventType = 'GEOFENCE_DWELL';
        }

        const newState: GeofenceStateRecord = {
          ...previousState,
          lastEvaluatedAt: now,
          dwellSeconds,
        };
        await redis.set(cacheKey, JSON.stringify(newState), 'EX', 86400);
      }
    }
  } catch {
    // Redis transient error fallback
  }

  return {
    geofenceId: geofence.id,
    targetType: geofence.targetType,
    isInside,
    distanceToCenterMeters,
    eventType,
    evaluatedAt: now,
    dwellSeconds,
  };
}
