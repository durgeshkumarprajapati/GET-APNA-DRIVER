import 'server-only';
import { LoyaltyTierCode, Prisma } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';

export const DEFAULT_LOYALTY_TIERS = [
  {
    code: LoyaltyTierCode.BRONZE,
    name: 'Bronze Member',
    minimumLifetimePoints: 0,
    minimumCompletedTrips: 0,
    priority: 1,
    pointMultiplier: new Prisma.Decimal(1.0),
    benefits: { description: 'Base 1x points on every completed trip' },
  },
  {
    code: LoyaltyTierCode.SILVER,
    name: 'Silver Chauffeur',
    minimumLifetimePoints: 500,
    minimumCompletedTrips: 5,
    priority: 2,
    pointMultiplier: new Prisma.Decimal(1.15),
    benefits: { description: '1.15x points multiplier & exclusive silver coupons' },
  },
  {
    code: LoyaltyTierCode.GOLD,
    name: 'Gold Executive',
    minimumLifetimePoints: 2000,
    minimumCompletedTrips: 20,
    priority: 3,
    pointMultiplier: new Prisma.Decimal(1.3),
    benefits: { description: '1.30x points multiplier, priority dispatch & gold rewards' },
  },
  {
    code: LoyaltyTierCode.PLATINUM,
    name: 'Platinum Elite',
    minimumLifetimePoints: 5000,
    minimumCompletedTrips: 50,
    priority: 4,
    pointMultiplier: new Prisma.Decimal(1.5),
    benefits: { description: '1.50x points multiplier, VIP support & premier rewards' },
  },
];

export async function ensureDefaultTiers(db: Db = prisma) {
  for (const tierDef of DEFAULT_LOYALTY_TIERS) {
    await db.loyaltyTier.upsert({
      where: { code: tierDef.code },
      create: tierDef,
      update: {},
    });
  }
}

export async function listLoyaltyTiers(db: Db = prisma) {
  await ensureDefaultTiers(db);
  return db.loyaltyTier.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { priority: 'asc' },
  });
}

export async function getTierByCode(code: LoyaltyTierCode, db: Db = prisma) {
  await ensureDefaultTiers(db);
  return db.loyaltyTier.findUniqueOrThrow({ where: { code } });
}

export async function evaluateTierForPoints(
  lifetimeEarnedPoints: number,
  db: Db = prisma,
) {
  const tiers = await listLoyaltyTiers(db);

  let currentTier = tiers[0]; // Default Bronze
  let nextTier = tiers.length > 1 ? tiers[1] : null;

  for (let i = 0; i < tiers.length; i++) {
    if (lifetimeEarnedPoints >= tiers[i].minimumLifetimePoints) {
      currentTier = tiers[i];
      nextTier = i < tiers.length - 1 ? tiers[i + 1] : null;
    } else {
      break;
    }
  }

  return { currentTier, nextTier };
}
