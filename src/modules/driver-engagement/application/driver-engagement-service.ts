import 'server-only';
import { Prisma } from '@prisma/client';
import { type Db, prisma } from '@/shared/database/prisma';
import {
  type DriverEngagementSummaryDTO,
  type DriverEngagementContext,
  type DriverAchievementProgressDTO,
} from '../domain/achievement-types';
import { defaultEvaluatorRegistry } from './achievement-evaluator';
import {
  getOrCreateDriverStreak,
  updateDriverStreakOnQualifyingActivity,
  getKolkataDateString,
} from './streak-service';
import {
  getCachedDriverEngagementSummary,
  setCachedDriverEngagementSummary,
  invalidateDriverEngagementCache,
} from '../infrastructure/engagement-cache';
import { getDriverGoal } from '@/modules/incentive/application/services/driver-goal-service';
import { getDriverEarningsSummary } from '@/modules/incentive/application/services/driver-earnings-service';

export async function evaluateDriverEngagement(
  driverProfileId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<{ newUnlocks: string[] }> {
  // 1. Update streak on qualifying activity if needed
  const streak = await updateDriverStreakOnQualifyingActivity(driverProfileId, now, db);

  // 2. Build compact driver context
  const [completedTripsCount, ratingSummary, earningsSummary, driverProfile, todayTripsCount] =
    await Promise.all([
      db.booking.count({
        where: { driverProfileId, status: 'TRIP_COMPLETED' },
      }),
      db.driverRatingSummary.findUnique({
        where: { driverProfileId },
      }),
      getDriverEarningsSummary(driverProfileId, now, db),
      db.driverProfile.findUnique({
        where: { id: driverProfileId },
        select: { approvalStatus: true, verificationStatus: true },
      }),
      db.booking.count({
        where: {
          driverProfileId,
          status: 'TRIP_COMPLETED',
          tripCompletedAt: {
            gte: new Date(`${getKolkataDateString(now)}T00:00:00.000Z`),
          },
        },
      }),
    ]);

  const isDocumentCompliant =
    driverProfile?.approvalStatus === 'APPROVED' &&
    driverProfile?.verificationStatus === 'VERIFIED';

  const context: DriverEngagementContext = {
    driverProfileId,
    completedTripsCount,
    ratingAverage: ratingSummary?.averageRating ? Number(ratingSummary.averageRating) : 0,
    totalRatingsCount: ratingSummary?.totalReviews ?? 0,
    weeklyEarnings: Number(earningsSummary.periodEarnings),
    currentStreakDays: streak.currentStreak,
    isDocumentCompliant,
    dailyTripsCompletedToday: todayTripsCount,
    weeklyTripsCompletedThisWeek: completedTripsCount,
    evaluatedAt: now,
  };

  // 3. Fetch active achievement definitions
  const definitions = await db.driverAchievementDefinition.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  // 4. Fetch existing unlocks
  const existingUnlocks = await db.driverAchievementUnlock.findMany({
    where: { driverProfileId },
    select: { achievementDefinitionId: true, achievementDefinition: { select: { code: true } } },
  });
  const unlockedDefIds = new Set(existingUnlocks.map((u) => u.achievementDefinitionId));

  const newUnlocks: string[] = [];

  for (const def of definitions) {
    const evalResult = defaultEvaluatorRegistry.evaluate(
      {
        code: def.code,
        category: def.category,
        targetValue: Number(def.targetValue),
        criteriaConfig: def.criteriaConfig,
      },
      context,
    );

    const isAlreadyUnlocked = unlockedDefIds.has(def.id);
    const isCompleted = isAlreadyUnlocked || evalResult.isUnlocked;

    // Upsert progress
    await db.driverAchievementProgress.upsert({
      where: {
        driverProfileId_achievementDefinitionId: {
          driverProfileId,
          achievementDefinitionId: def.id,
        },
      },
      create: {
        driverProfileId,
        achievementDefinitionId: def.id,
        currentValue: new Prisma.Decimal(evalResult.currentValue),
        targetValue: def.targetValue,
        isCompleted,
        completedAt: isCompleted ? now : null,
        lastEvaluatedAt: now,
      },
      update: {
        currentValue: new Prisma.Decimal(evalResult.currentValue),
        isCompleted,
        completedAt: isCompleted ? (isAlreadyUnlocked ? undefined : now) : null,
        lastEvaluatedAt: now,
      },
    });

    // Idempotent unlock creation if newly completed
    if (evalResult.isUnlocked && !isAlreadyUnlocked) {
      try {
        await db.driverAchievementUnlock.create({
          data: {
            driverProfileId,
            achievementDefinitionId: def.id,
            unlockedAt: now,
            idempotencyKey: `unlock:${driverProfileId}:${def.code}`,
          },
        });
        newUnlocks.push(def.code);
      } catch {
        // Idempotency constraint collision safe catch
      }
    }
  }

  await invalidateDriverEngagementCache(driverProfileId);

  return { newUnlocks };
}

export async function getDriverEngagementSummary(
  driverProfileId: string,
  now: Date = new Date(),
  db: Db = prisma,
  bypassCache = false,
): Promise<DriverEngagementSummaryDTO> {
  if (!bypassCache) {
    const cached = await getCachedDriverEngagementSummary(driverProfileId);
    if (cached) return cached;
  }

  const streak = await getOrCreateDriverStreak(driverProfileId, db);
  const definitions = await db.driverAchievementDefinition.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  const [progresses, unlocks, goalData] = await Promise.all([
    db.driverAchievementProgress.findMany({
      where: { driverProfileId },
    }),
    db.driverAchievementUnlock.findMany({
      where: { driverProfileId },
      include: { achievementDefinition: true },
      orderBy: { unlockedAt: 'desc' },
    }),
    getDriverGoal(driverProfileId, now, db),
  ]);

  const progressMap = new Map(progresses.map((p) => [p.achievementDefinitionId, p]));
  const unlockedMap = new Map(unlocks.map((u) => [u.achievementDefinitionId, u]));

  const activeProgress: DriverAchievementProgressDTO[] = definitions.map((def) => {
    const prog = progressMap.get(def.id);
    const unl = unlockedMap.get(def.id);

    const targetVal = Number(def.targetValue);
    const currVal = prog ? Number(prog.currentValue) : 0;
    const isUnlocked = Boolean(unl || prog?.isCompleted);
    const percentage = targetVal > 0 ? Math.min(Math.round((currVal / targetVal) * 100), 100) : 0;

    return {
      achievementId: def.id,
      code: def.code,
      name: def.name,
      description: def.description,
      category: def.category,
      badgeIcon: def.badgeIcon,
      currentValue: currVal,
      targetValue: targetVal,
      percentage: isUnlocked ? 100 : percentage,
      isUnlocked,
      unlockedAt: unl?.unlockedAt ? unl.unlockedAt.toISOString() : null,
    };
  });

  const recentUnlocks = unlocks.slice(0, 3).map((u) => ({
    code: u.achievementDefinition.code,
    name: u.achievementDefinition.name,
    badgeIcon: u.achievementDefinition.badgeIcon,
    unlockedAt: u.unlockedAt.toISOString(),
  }));

  const summary: DriverEngagementSummaryDTO = {
    driverProfileId,
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastQualifyingDate: streak.lastQualifyingDate
        ? getKolkataDateString(streak.lastQualifyingDate)
        : null,
      streakStatus: streak.streakStatus,
    },
    totalUnlockedCount: unlocks.length,
    totalCatalogCount: definitions.length,
    recentUnlocks,
    activeProgress,
    dailyGoal: {
      targetTrips: goalData.dailyTripGoal,
      completedTrips: goalData.completedTripsToday,
      progressPercentage: goalData.dailyTripProgressPercentage,
    },
    weeklyGoal: {
      targetEarnings: Number(goalData.weeklyEarningsGoal),
      completedEarnings: goalData.earningsThisWeek,
      progressPercentage: goalData.weeklyEarningsProgressPercentage,
    },
  };

  await setCachedDriverEngagementSummary(driverProfileId, summary, 60);

  return summary;
}
