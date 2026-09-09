import 'server-only';
import { redis } from '../redis/client';
import { logger } from '../logging/logger';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks and increments rate limit counter using Redis.
 * Key structure recommendation: `rate_limit:<namespace>:<identifier>`
 */
export async function checkRateLimit(
  namespace: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `rate_limit:${namespace}:${identifier}`;

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);
    const resetSeconds = ttl > 0 ? ttl : windowSeconds;
    const remaining = Math.max(0, limit - current);
    const allowed = current <= limit;

    return {
      allowed,
      limit,
      remaining,
      resetSeconds,
    };
  } catch (error) {
    logger.warn({ error, namespace, identifier }, 'Redis rate limit error; failing open safely');
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetSeconds: windowSeconds,
    };
  }
}
