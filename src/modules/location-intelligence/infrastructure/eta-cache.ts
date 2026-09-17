import 'server-only';
import { redis } from '@/shared/redis/client';
import type { RouteEstimateRequest, ETAResult } from '../domain/eta-types';

/**
 * Creates a bounded cache key for ETA requests using bucketed coordinates to prevent key explosion.
 */
export function buildETACacheKey(request: RouteEstimateRequest): string {
  if (request.bookingId) {
    return `location:eta:booking:${request.bookingId}:${request.context || 'GENERAL'}`;
  }

  // Bucket coordinates to ~100m grid precision (3 decimal places = ~110m)
  const origLatBucket = request.origin.latitude.toFixed(3);
  const origLonBucket = request.origin.longitude.toFixed(3);
  const destLatBucket = request.destination.latitude.toFixed(3);
  const destLonBucket = request.destination.longitude.toFixed(3);

  return `location:eta:route:${origLatBucket}_${origLonBucket}:${destLatBucket}_${destLonBucket}`;
}

export async function getCachedETA(request: RouteEstimateRequest): Promise<ETAResult | null> {
  const cacheKey = buildETACacheKey(request);
  try {
    const raw = await redis.get(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw) as ETAResult;
  } catch {
    return null;
  }
}

export async function setCachedETA(
  request: RouteEstimateRequest,
  result: ETAResult,
  ttlSeconds: number = 30,
): Promise<void> {
  const cacheKey = buildETACacheKey(request);
  try {
    await redis.set(cacheKey, JSON.stringify(result), 'EX', ttlSeconds);
  } catch {
    // Fail-open for Redis transient issues
  }
}
