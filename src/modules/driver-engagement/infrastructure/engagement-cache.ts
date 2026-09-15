import 'server-only';
import { redis } from '@/shared/redis/client';
import { type DriverEngagementSummaryDTO } from '../domain/achievement-types';

const CACHE_PREFIX = 'driver-engagement:driver:';
const DEFAULT_TTL_SECONDS = 60;

export async function getCachedDriverEngagementSummary(
  driverProfileId: string,
): Promise<DriverEngagementSummaryDTO | null> {
  try {
    const raw = await redis.get(`${CACHE_PREFIX}${driverProfileId}`);
    if (!raw) return null;
    return JSON.parse(raw) as DriverEngagementSummaryDTO;
  } catch {
    return null;
  }
}

export async function setCachedDriverEngagementSummary(
  driverProfileId: string,
  summary: DriverEngagementSummaryDTO,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  try {
    await redis.setex(`${CACHE_PREFIX}${driverProfileId}`, ttlSeconds, JSON.stringify(summary));
  } catch {
    // Non-blocking write fallback
  }
}

export async function invalidateDriverEngagementCache(driverProfileId: string): Promise<void> {
  try {
    await redis.del(`${CACHE_PREFIX}${driverProfileId}`);
  } catch {
    // Non-blocking del fallback
  }
}
