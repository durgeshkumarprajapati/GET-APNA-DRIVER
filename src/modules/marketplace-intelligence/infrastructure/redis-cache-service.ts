import 'server-only';
import { redis } from '@/shared/redis/client';

const CACHE_PREFIX = 'marketplace-intelligence:';

export async function getCachedMarketplaceData<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[MarketplaceIntelligenceCache] Cache read error for key ${key}:`, error);
    return null;
  }
}

export async function setCachedMarketplaceData(
  key: string,
  data: unknown,
  ttlSeconds: number = 60,
): Promise<void> {
  try {
    await redis.set(`${CACHE_PREFIX}${key}`, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (error) {
    console.warn(`[MarketplaceIntelligenceCache] Cache write error for key ${key}:`, error);
  }
}

export async function invalidateMarketplaceCachePattern(pattern: string = '*'): Promise<void> {
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn(`[MarketplaceIntelligenceCache] Cache invalidation error for pattern ${pattern}:`, error);
  }
}
