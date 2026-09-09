import 'server-only';
import { redis } from '@/shared/redis/client';
import { logger } from '@/shared/logging/logger';
import type { UserRbacSnapshot } from './rbac-repository';

/**
 * Redis cache for a user's flattened role/permission snapshot — the most
 * expensive part of resolving a principal (a 3-level join re-executed on
 * every single authenticated API request otherwise; see principal-service.ts).
 *
 * Cache key: `rbac:snapshot:<userId>`
 * TTL: 60s (short enough that a role change is never stale for long; a
 *   role/permission grant taking up to 60s to take effect is an accepted
 *   tradeoff, same category of staleness the existing SystemConfiguration
 *   cache already accepts at a 300s TTL).
 * Invalidation trigger: explicit `invalidateUserRbacSnapshot` call from the
 *   two low-level mutation functions that can change a user's roles
 *   (`upsertRoleAssignment`, `revokeRoleAssignment` in rbac-repository.ts) —
 *   a single choke point covers every caller (admin grant/revoke, and the
 *   registration/onboarding flows that self-assign a role), so there is no
 *   scattered per-call-site invalidation to keep in sync.
 * Fallback behavior: any Redis error (get or set) is caught and treated as
 *   a cache miss — falls through to the real DB query, exactly like the
 *   existing configuration cache. A Redis outage degrades to "every request
 *   re-queries Postgres," never to "requests fail" or "stale permissions
 *   are trusted forever."
 */

const CACHE_TTL_SECONDS = 60;

function cacheKey(userId: string): string {
  return `rbac:snapshot:${userId}`;
}

export async function getCachedUserRbacSnapshot(userId: string): Promise<UserRbacSnapshot | null> {
  try {
    const raw = await redis.get(cacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as UserRbacSnapshot;
  } catch (err) {
    logger.warn({ err, userId }, 'RBAC snapshot cache read failed; falling back to database');
    return null;
  }
}

export async function setCachedUserRbacSnapshot(
  userId: string,
  snapshot: UserRbacSnapshot,
): Promise<void> {
  try {
    await redis.set(cacheKey(userId), JSON.stringify(snapshot), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err, userId }, 'RBAC snapshot cache write failed; continuing without cache');
  }
}

export async function invalidateUserRbacSnapshot(userId: string): Promise<void> {
  try {
    await redis.del(cacheKey(userId));
  } catch (err) {
    logger.warn({ err, userId }, 'RBAC snapshot cache invalidation failed');
  }
}
