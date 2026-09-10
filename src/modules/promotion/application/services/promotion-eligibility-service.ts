import 'server-only';
import { Prisma, type Promotion } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { toDecimal, ZERO } from '@/modules/finance/domain/money';
import { calculateDiscountAmount } from '../../domain/discount-calculator';
import { isPromotionCurrentlyUsable } from '../../domain/promotion-state-machine';
import {
  PromotionAlreadyAppliedToBookingError,
  PromotionExpiredError,
  PromotionFirstRideOnlyError,
  PromotionMinimumBookingValueNotMetError,
  PromotionNotActiveError,
  PromotionNotFoundError,
  PromotionNotYetStartedError,
  PromotionPerUserUsageLimitReachedError,
  PromotionUsageLimitReachedError,
} from '../../domain/errors';
import type { CustomerOfferView, PromotionSummary } from '../../domain/types';

function mapPromotionToSummary(promotion: Promotion, now: Date = new Date()): PromotionSummary {
  const isExpired = promotion.status === 'ACTIVE' && !!promotion.endsAt && now > promotion.endsAt;
  return {
    id: promotion.id,
    code: promotion.code,
    name: promotion.name,
    description: promotion.description,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue.toFixed(4),
    maxDiscountAmount: promotion.maxDiscountAmount ? promotion.maxDiscountAmount.toFixed(4) : null,
    minBookingValue: promotion.minBookingValue ? promotion.minBookingValue.toFixed(4) : null,
    firstRideOnly: promotion.firstRideOnly,
    isAutomatic: promotion.isAutomatic,
    status: promotion.status,
    isExpired,
    startsAt: promotion.startsAt.toISOString(),
    endsAt: promotion.endsAt ? promotion.endsAt.toISOString() : null,
    totalUsageLimit: promotion.totalUsageLimit,
    totalUsageCount: promotion.totalUsageCount,
    perUserUsageLimit: promotion.perUserUsageLimit,
    createdBy: promotion.createdBy,
    createdAt: promotion.createdAt.toISOString(),
    updatedAt: promotion.updatedAt.toISOString(),
  };
}

/** No stored "has this customer completed a ride" flag anywhere — first-ride eligibility is always derived from actual booking history, never a client claim. */
async function isFirstRideCustomer(customerId: string, db: Db): Promise<boolean> {
  const completedCount = await db.booking.count({
    where: { customerId, status: 'TRIP_COMPLETED' },
  });
  return completedCount === 0;
}

/**
 * Read-only, advisory eligibility check for the fare-estimate and
 * customer-offers screens. Not itself a reservation — no row lock, no usage
 * increment. The authoritative, race-safe check happens again in
 * validateAndReservePromotionUsage at booking-creation time.
 */
export async function evaluateEligiblePromotions(
  customerId: string,
  fareAmount: string,
  db: Db = prisma,
): Promise<PromotionSummary[]> {
  const now = new Date();
  const candidates = await db.promotion.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  const firstRide = await isFirstRideCustomer(customerId, db);
  const fare = toDecimal(fareAmount);

  const eligible: PromotionSummary[] = [];
  for (const promotion of candidates) {
    if (!isPromotionCurrentlyUsable(promotion.status, promotion.startsAt, promotion.endsAt, now)) {
      continue;
    }
    if (promotion.minBookingValue && fare.lessThan(toDecimal(promotion.minBookingValue))) {
      continue;
    }
    if (promotion.firstRideOnly && !firstRide) {
      continue;
    }
    if (
      promotion.totalUsageLimit !== null &&
      promotion.totalUsageCount >= promotion.totalUsageLimit
    ) {
      continue;
    }
    if (promotion.perUserUsageLimit !== null) {
      const usedCount = await db.promotionUsage.count({
        where: { promotionId: promotion.id, userId: customerId },
      });
      if (usedCount >= promotion.perUserUsageLimit) {
        continue;
      }
    }
    eligible.push(mapPromotionToSummary(promotion, now));
  }

  return eligible;
}

export interface ApplyPromotionInput {
  userId: string;
  bookingId: string;
  fareAmount: string;
  /** Explicit code the customer entered/selected. Omit to only consider automatic promotions. */
  promotionCode?: string | null;
}

export interface AppliedPromotionResult {
  promotionId: string;
  promotionCodeSnapshot: string | null;
  discountType: Promotion['discountType'];
  discountValueSnapshot: string;
  discountAmount: string;
}

async function assertPromotionEligible(
  promotion: Promotion,
  input: { userId: string; fareAmount: string },
  db: Db,
): Promise<void> {
  const now = new Date();
  if (now < promotion.startsAt) {
    throw new PromotionNotYetStartedError(promotion.code ?? promotion.id);
  }
  if (promotion.status !== 'ACTIVE') {
    throw new PromotionNotActiveError(promotion.code ?? promotion.id);
  }
  if (promotion.endsAt && now > promotion.endsAt) {
    throw new PromotionExpiredError(promotion.code ?? promotion.id);
  }
  if (
    promotion.minBookingValue &&
    toDecimal(input.fareAmount).lessThan(toDecimal(promotion.minBookingValue))
  ) {
    throw new PromotionMinimumBookingValueNotMetError(
      promotion.minBookingValue.toFixed(4),
      toDecimal(input.fareAmount).toFixed(4),
    );
  }
  if (promotion.firstRideOnly) {
    const firstRide = await isFirstRideCustomer(input.userId, db);
    if (!firstRide) {
      throw new PromotionFirstRideOnlyError();
    }
  }
  if (
    promotion.totalUsageLimit !== null &&
    promotion.totalUsageCount >= promotion.totalUsageLimit
  ) {
    throw new PromotionUsageLimitReachedError(promotion.code ?? promotion.id);
  }
  if (promotion.perUserUsageLimit !== null) {
    const usedCount = await db.promotionUsage.count({
      where: { promotionId: promotion.id, userId: input.userId },
    });
    if (usedCount >= promotion.perUserUsageLimit) {
      throw new PromotionPerUserUsageLimitReachedError(promotion.code ?? promotion.id);
    }
  }
}

/**
 * The single authoritative place a promotion is validated and consumed.
 * MUST be called with `tx` — the same transaction that is creating the
 * Booking row — so the reservation and the booking either both commit or
 * both roll back together.
 *
 * Concurrency safety: takes `SELECT ... FOR UPDATE` on the target Promotion
 * row before reading it, serializing every concurrent redemption attempt for
 * that promotion (mirrors outbox-dispatcher-service.ts's `FOR UPDATE SKIP
 * LOCKED` claim query). Every check in assertPromotionEligible above then
 * runs against a row no other transaction can concurrently mutate, so the
 * global and per-user usage limits are exact — never "only application-level
 * counting" racing two concurrent requests.
 *
 * Never trusts a client-supplied discountAmount, promotionId, or final
 * fare — only a `promotionCode` (or nothing, for automatic promotions) is
 * accepted, and the discount is always recomputed here from the promotion's
 * live, locked terms and the server-calculated fare.
 */
export async function validateAndReservePromotionUsage(
  tx: Db,
  input: ApplyPromotionInput,
): Promise<AppliedPromotionResult | null> {
  const existingUsage = await tx.promotionUsage.findUnique({
    where: { bookingId: input.bookingId },
  });
  if (existingUsage) {
    throw new PromotionAlreadyAppliedToBookingError(input.bookingId);
  }

  let targetPromotionId: string | null = null;
  let mustSucceed = false;

  if (input.promotionCode) {
    const byCode = await tx.promotion.findUnique({ where: { code: input.promotionCode } });
    if (!byCode) {
      throw new PromotionNotFoundError(input.promotionCode);
    }
    targetPromotionId = byCode.id;
    mustSucceed = true;
  } else {
    // No code supplied — consider automatic promotions only. This initial
    // scan is unlocked (just picking a candidate); the chosen one is fully
    // re-validated under lock below, so a race here can only ever result in
    // "no discount applied", never a double-grant.
    const now = new Date();
    const automaticCandidates = await tx.promotion.findMany({
      where: { status: 'ACTIVE', isAutomatic: true },
    });
    let bestDiscount = ZERO;
    for (const candidate of automaticCandidates) {
      if (
        !isPromotionCurrentlyUsable(candidate.status, candidate.startsAt, candidate.endsAt, now)
      ) {
        continue;
      }
      const discount = toDecimal(
        calculateDiscountAmount({
          discountType: candidate.discountType,
          discountValue: candidate.discountValue,
          maxDiscountAmount: candidate.maxDiscountAmount,
          fareAmount: input.fareAmount,
        }),
      );
      if (discount.greaterThan(bestDiscount)) {
        bestDiscount = discount;
        targetPromotionId = candidate.id;
      }
    }
  }

  if (!targetPromotionId) {
    return null;
  }

  // Row lock: serializes every concurrent redemption attempt for this promotion.
  await tx.$queryRaw`SELECT id FROM promotions WHERE id = ${targetPromotionId} FOR UPDATE`;
  const promotion = await tx.promotion.findUnique({ where: { id: targetPromotionId } });
  if (!promotion) {
    if (mustSucceed) {
      throw new PromotionNotFoundError(targetPromotionId);
    }
    return null;
  }

  try {
    await assertPromotionEligible(
      promotion,
      { userId: input.userId, fareAmount: input.fareAmount },
      tx,
    );
  } catch (err) {
    if (mustSucceed) {
      throw err;
    }
    // Automatic promotion lost its eligibility between the unlocked scan and
    // the lock (e.g. another request just consumed the last slot) — the
    // booking simply proceeds with no discount rather than failing outright.
    return null;
  }

  const discountAmount = calculateDiscountAmount({
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    maxDiscountAmount: promotion.maxDiscountAmount,
    fareAmount: input.fareAmount,
  });

  await tx.promotion.update({
    where: { id: promotion.id },
    data: { totalUsageCount: { increment: 1 } },
  });

  try {
    await tx.promotionUsage.create({
      data: {
        promotionId: promotion.id,
        userId: input.userId,
        bookingId: input.bookingId,
        discountAmount,
        promotionCodeSnapshot: promotion.code,
        discountTypeSnapshot: promotion.discountType,
        discountValueSnapshot: promotion.discountValue,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new PromotionAlreadyAppliedToBookingError(input.bookingId);
    }
    throw err;
  }

  return {
    promotionId: promotion.id,
    promotionCodeSnapshot: promotion.code,
    discountType: promotion.discountType,
    discountValueSnapshot: promotion.discountValue.toFixed(4),
    discountAmount,
  };
}

export async function getCustomerOffers(
  customerId: string,
  db: Db = prisma,
): Promise<{
  available: CustomerOfferView[];
  used: CustomerOfferView[];
  expired: CustomerOfferView[];
}> {
  const now = new Date();
  const [promotions, usages] = await Promise.all([
    db.promotion.findMany({ orderBy: { createdAt: 'desc' } }),
    db.promotionUsage.findMany({ where: { userId: customerId } }),
  ]);

  const usageCountByPromotion = new Map<string, number>();
  for (const usage of usages) {
    usageCountByPromotion.set(
      usage.promotionId,
      (usageCountByPromotion.get(usage.promotionId) ?? 0) + 1,
    );
  }

  const firstRide = await isFirstRideCustomer(customerId, db);

  const available: CustomerOfferView[] = [];
  const used: CustomerOfferView[] = [];
  const expired: CustomerOfferView[] = [];

  for (const promotion of promotions) {
    const usedByCustomerCount = usageCountByPromotion.get(promotion.id) ?? 0;
    const remainingUsesForCustomer =
      promotion.perUserUsageLimit !== null
        ? Math.max(0, promotion.perUserUsageLimit - usedByCustomerCount)
        : null;
    const view: CustomerOfferView = {
      ...mapPromotionToSummary(promotion, now),
      usedByCustomerCount,
      remainingUsesForCustomer,
    };

    const isPastWindow = view.isExpired || promotion.status === 'ARCHIVED';
    const isUsableNow =
      isPromotionCurrentlyUsable(promotion.status, promotion.startsAt, promotion.endsAt, now) &&
      (!promotion.firstRideOnly || firstRide) &&
      (promotion.totalUsageLimit === null ||
        promotion.totalUsageCount < promotion.totalUsageLimit) &&
      (remainingUsesForCustomer === null || remainingUsesForCustomer > 0);

    if (isUsableNow) {
      available.push(view);
    } else if (usedByCustomerCount > 0) {
      used.push(view);
    } else if (isPastWindow) {
      expired.push(view);
    }
  }

  return { available, used, expired };
}
