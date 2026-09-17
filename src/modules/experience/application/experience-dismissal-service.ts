import { prisma } from '@/shared/database/prisma';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';

export async function dismissExperience(
  userId: string,
  experienceType: string,
  fingerprint: string,
  expiresAt?: Date,
): Promise<boolean> {
  const lockKey = `lock:experience_dismiss:${userId}:${fingerprint}`;
  const acquired = await RedisLockService.acquireLock(lockKey, 3000);

  try {
    await prisma.experienceDismissal.upsert({
      where: {
        userId_fingerprint: {
          userId,
          fingerprint,
        },
      },
      create: {
        userId,
        experienceType,
        fingerprint,
        expiresAt: expiresAt ?? null,
      },
      update: {
        dismissedAt: new Date(),
        expiresAt: expiresAt ?? null,
      },
    });
    return true;
  } catch (error) {
    console.error(`[ExperienceDismissalService] Failed to dismiss experience:`, error);
    return false;
  } finally {
    if (acquired) {
      await RedisLockService.releaseLock(lockKey);
    }
  }
}

export async function getDismissedFingerprints(userId: string): Promise<Set<string>> {
  try {
    const records = await prisma.experienceDismissal.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { fingerprint: true },
    });
    return new Set(records.map((r) => r.fingerprint));
  } catch (error) {
    console.error(`[ExperienceDismissalService] Failed to fetch dismissals:`, error);
    return new Set();
  }
}

export async function clearUserDismissals(userId: string): Promise<number> {
  try {
    const result = await prisma.experienceDismissal.deleteMany({
      where: { userId },
    });
    return result.count;
  } catch (error) {
    console.error(`[ExperienceDismissalService] Failed to clear dismissals:`, error);
    return 0;
  }
}
