import 'server-only';
import { redis } from '@/shared/redis/client';
import { type RecommendationDTO } from '../domain/recommendation-types';

const CACHE_PREFIX = 'recommendations:customer:';
const DEFAULT_TTL_SECONDS = 60;

export async function getCachedRecommendations(
  customerId: string,
): Promise<RecommendationDTO[] | null> {
  try {
    const raw = await redis.get(`${CACHE_PREFIX}${customerId}`);
    if (!raw) return null;
    return JSON.parse(raw) as RecommendationDTO[];
  } catch {
    return null;
  }
}

export async function setCachedRecommendations(
  customerId: string,
  recommendations: RecommendationDTO[],
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  try {
    await redis.setex(
      `${CACHE_PREFIX}${customerId}`,
      ttlSeconds,
      JSON.stringify(recommendations),
    );
  } catch {
    // Non-blocking write failure fallback
  }
}

export async function invalidateRecommendationCache(customerId: string): Promise<void> {
  try {
    await redis.del(`${CACHE_PREFIX}${customerId}`);
  } catch {
    // Non-blocking del failure fallback
  }
}
