import 'server-only';
import { Prisma, type DriverCoupon, type DriverCouponStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent, triggerImmediateOutboxDispatch } from '@/shared/outbox/outbox-service';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { postFinancialTransaction } from '@/modules/finance/application/services/ledger-service';
import { applyWalletChange } from '@/modules/finance/application/services/wallet-service';
import { LEDGER_ACCOUNT_CODES } from '@/modules/finance/domain/ledger-accounts';
import { ZERO, roundMoney, toDecimal } from '@/modules/finance/domain/money';
import {
  isDriverCouponCurrentlyUsable,
  isDriverCouponEditable,
  validateDriverCouponStatusTransition,
} from '../../domain/driver-coupon-state-machine';
import {
  DriverCouponAlreadyRedeemedError,
  DriverCouponCodeAlreadyExistsError,
  DriverCouponExpiredError,
  DriverCouponNotActiveError,
  DriverCouponNotEditableError,
  DriverCouponNotFoundError,
  DriverCouponNotYetStartedError,
  DriverCouponUsageLimitReachedError,
  InvalidDriverCouponConfigError,
} from '../../domain/driver-coupon-errors';
import type {
  DriverCouponRedemptionSummary,
  DriverCouponSummary,
} from '../../domain/driver-coupon-types';

function mapDriverCouponToSummary(
  coupon: DriverCoupon,
  now: Date = new Date(),
): DriverCouponSummary {
  const isExpired = coupon.status === 'ACTIVE' && !!coupon.endsAt && now > coupon.endsAt;
  return {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    description: coupon.description,
    creditAmount: coupon.creditAmount.toFixed(4),
    status: coupon.status,
    isExpired,
    startsAt: coupon.startsAt.toISOString(),
    endsAt: coupon.endsAt ? coupon.endsAt.toISOString() : null,
    totalUsageLimit: coupon.totalUsageLimit,
    totalUsageCount: coupon.totalUsageCount,
    createdBy: coupon.createdBy,
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
  };
}

export interface DriverCouponConfigInput {
  code: string;
  name: string;
  description?: string | null;
  creditAmount: string;
  startsAt: string;
  endsAt?: string | null;
  totalUsageLimit?: number | null;
}

function assertValidDriverCouponConfig(input: DriverCouponConfigInput): void {
  if (!input.name.trim()) {
    throw new InvalidDriverCouponConfigError('Coupon name is required');
  }
  if (!input.code.trim()) {
    throw new InvalidDriverCouponConfigError('Coupon code is required');
  }

  const creditAmount = toDecimal(input.creditAmount);
  if (creditAmount.lessThanOrEqualTo(ZERO)) {
    throw new InvalidDriverCouponConfigError('Credit amount must be greater than zero');
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new InvalidDriverCouponConfigError('A valid start date is required');
  }
  if (input.endsAt) {
    const endsAt = new Date(input.endsAt);
    if (Number.isNaN(endsAt.getTime())) {
      throw new InvalidDriverCouponConfigError('End date is invalid');
    }
    if (endsAt <= startsAt) {
      throw new InvalidDriverCouponConfigError('End date must be after the start date');
    }
  }

  if (
    input.totalUsageLimit !== null &&
    input.totalUsageLimit !== undefined &&
    input.totalUsageLimit < 1
  ) {
    throw new InvalidDriverCouponConfigError('Total usage limit must be at least 1');
  }
}

export async function createDriverCoupon(
  actorUserId: string,
  input: DriverCouponConfigInput,
  db: Db = prisma,
): Promise<DriverCouponSummary> {
  assertValidDriverCouponConfig(input);

  try {
    const coupon = await db.driverCoupon.create({
      data: {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        description: input.description ?? null,
        creditAmount: input.creditAmount,
        status: 'DRAFT',
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        totalUsageLimit: input.totalUsageLimit ?? null,
        createdBy: actorUserId,
      },
    });

    await recordAuditLog(db, {
      actorUserId,
      action: 'driver_coupon.created',
      entityType: 'DriverCoupon',
      entityId: coupon.id,
      beforeState: null,
      afterState: { name: coupon.name, code: coupon.code, status: coupon.status },
      requestMetadata: null,
    });

    return mapDriverCouponToSummary(coupon);
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new DriverCouponCodeAlreadyExistsError(input.code);
    }
    throw err;
  }
}

async function loadDriverCouponOrThrow(driverCouponId: string, db: Db): Promise<DriverCoupon> {
  const coupon = await db.driverCoupon.findUnique({ where: { id: driverCouponId } });
  if (!coupon) {
    throw new DriverCouponNotFoundError(driverCouponId);
  }
  return coupon;
}

/** Only a DRAFT coupon (never yet activated, therefore never yet redeemed) may have its terms edited. */
export async function updateDriverCoupon(
  actorUserId: string,
  driverCouponId: string,
  input: DriverCouponConfigInput,
  db: Db = prisma,
): Promise<DriverCouponSummary> {
  const current = await loadDriverCouponOrThrow(driverCouponId, db);
  if (!isDriverCouponEditable(current.status)) {
    throw new DriverCouponNotEditableError(current.status);
  }
  assertValidDriverCouponConfig(input);

  try {
    const updated = await db.driverCoupon.update({
      where: { id: driverCouponId },
      data: {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        description: input.description ?? null,
        creditAmount: input.creditAmount,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        totalUsageLimit: input.totalUsageLimit ?? null,
      },
    });

    await recordAuditLog(db, {
      actorUserId,
      action: 'driver_coupon.updated',
      entityType: 'DriverCoupon',
      entityId: driverCouponId,
      beforeState: { name: current.name, creditAmount: current.creditAmount.toFixed(4) },
      afterState: { name: updated.name, creditAmount: updated.creditAmount.toFixed(4) },
      requestMetadata: null,
    });

    return mapDriverCouponToSummary(updated);
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new DriverCouponCodeAlreadyExistsError(input.code);
    }
    throw err;
  }
}

async function transitionDriverCouponStatus(
  actorUserId: string,
  driverCouponId: string,
  targetStatus: DriverCouponStatus,
  action: string,
  db: Db,
): Promise<DriverCouponSummary> {
  const current = await loadDriverCouponOrThrow(driverCouponId, db);
  validateDriverCouponStatusTransition(current.status, targetStatus);

  const updated = await db.driverCoupon.update({
    where: { id: driverCouponId },
    data: { status: targetStatus },
  });

  await recordAuditLog(db, {
    actorUserId,
    action,
    entityType: 'DriverCoupon',
    entityId: driverCouponId,
    beforeState: { status: current.status },
    afterState: { status: targetStatus },
    requestMetadata: null,
  });

  return mapDriverCouponToSummary(updated);
}

export async function activateDriverCoupon(
  actorUserId: string,
  driverCouponId: string,
  db: Db = prisma,
): Promise<DriverCouponSummary> {
  return transitionDriverCouponStatus(
    actorUserId,
    driverCouponId,
    'ACTIVE',
    'driver_coupon.activated',
    db,
  );
}

/** "Disable" a coupon without losing its history — pauses it; it can be reactivated. */
export async function pauseDriverCoupon(
  actorUserId: string,
  driverCouponId: string,
  db: Db = prisma,
): Promise<DriverCouponSummary> {
  return transitionDriverCouponStatus(
    actorUserId,
    driverCouponId,
    'PAUSED',
    'driver_coupon.paused',
    db,
  );
}

/** "Delete" a coupon — soft-delete only (terminal, irreversible), consistent with Promotion's own immutability design. */
export async function archiveDriverCoupon(
  actorUserId: string,
  driverCouponId: string,
  db: Db = prisma,
): Promise<DriverCouponSummary> {
  return transitionDriverCouponStatus(
    actorUserId,
    driverCouponId,
    'ARCHIVED',
    'driver_coupon.archived',
    db,
  );
}

export async function getDriverCouponById(
  driverCouponId: string,
  db: Db = prisma,
): Promise<DriverCouponSummary> {
  const coupon = await loadDriverCouponOrThrow(driverCouponId, db);
  return mapDriverCouponToSummary(coupon);
}

export interface ListDriverCouponsFilters {
  status?: DriverCouponStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListDriverCouponsResult {
  coupons: DriverCouponSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listDriverCoupons(
  filters: ListDriverCouponsFilters = {},
  db: Db = prisma,
): Promise<ListDriverCouponsResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.DriverCouponWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' as const } },
            { code: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [coupons, total] = await Promise.all([
    db.driverCoupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.driverCoupon.count({ where }),
  ]);

  return { coupons: coupons.map((c) => mapDriverCouponToSummary(c)), total, page, pageSize };
}

export interface ListDriverCouponRedemptionsResult {
  redemptions: DriverCouponRedemptionSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listDriverCouponRedemptions(
  driverCouponId: string,
  pagination: { page?: number; pageSize?: number } = {},
  db: Db = prisma,
): Promise<ListDriverCouponRedemptionsResult> {
  await loadDriverCouponOrThrow(driverCouponId, db);

  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize =
    pagination.pageSize && pagination.pageSize > 0 ? Math.min(pagination.pageSize, 100) : 25;

  const [redemptions, total] = await Promise.all([
    db.driverCouponRedemption.findMany({
      where: { driverCouponId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.driverCouponRedemption.count({ where: { driverCouponId } }),
  ]);

  return {
    redemptions: redemptions.map((r) => ({
      id: r.id,
      driverCouponId: r.driverCouponId,
      driverProfileId: r.driverProfileId,
      creditAmountSnapshot: r.creditAmountSnapshot.toFixed(4),
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

/**
 * Redeems a coupon code for the calling driver: a direct, one-time credit
 * to DriverWallet.availableBalance. Concurrency-safe the same way
 * validateAndReservePromotionUsage is in promotion-eligibility-service.ts —
 * `SELECT ... FOR UPDATE` on the DriverCoupon row serializes every
 * concurrent redemption attempt for that coupon so totalUsageCount and the
 * usage limit are exact, and the `@@unique([driverCouponId,
 * driverProfileId])` constraint on DriverCouponRedemption is the second,
 * independent guarantee against a double-tap race.
 */
export async function redeemDriverCoupon(
  driverUserId: string,
  code: string,
  db: Db = prisma,
): Promise<DriverCouponRedemptionSummary> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);
  const normalizedCode = code.trim().toUpperCase();

  const result = await db.$transaction(async (tx: Db) => {
    const byCode = await tx.driverCoupon.findUnique({ where: { code: normalizedCode } });
    if (!byCode) {
      throw new DriverCouponNotFoundError(normalizedCode);
    }

    // Row lock: serializes every concurrent redemption attempt for this coupon.
    await tx.$queryRaw`SELECT id FROM driver_coupons WHERE id = ${byCode.id} FOR UPDATE`;
    const coupon = await tx.driverCoupon.findUnique({ where: { id: byCode.id } });
    if (!coupon) {
      throw new DriverCouponNotFoundError(normalizedCode);
    }

    if (coupon.status !== 'ACTIVE') {
      throw new DriverCouponNotActiveError(coupon.code);
    }
    const now = new Date();
    if (now < coupon.startsAt) {
      throw new DriverCouponNotYetStartedError(coupon.code);
    }
    if (coupon.endsAt && now > coupon.endsAt) {
      throw new DriverCouponExpiredError(coupon.code);
    }
    if (coupon.totalUsageLimit !== null && coupon.totalUsageCount >= coupon.totalUsageLimit) {
      throw new DriverCouponUsageLimitReachedError(coupon.code);
    }

    const existingRedemption = await tx.driverCouponRedemption.findUnique({
      where: {
        driverCouponId_driverProfileId: { driverCouponId: coupon.id, driverProfileId: profile.id },
      },
    });
    if (existingRedemption) {
      throw new DriverCouponAlreadyRedeemedError(coupon.code);
    }

    const creditAmount = roundMoney(toDecimal(coupon.creditAmount));

    const financialTransaction = await postFinancialTransaction(
      {
        transactionType: 'DRIVER_COUPON_REDEEMED',
        referenceEntityType: 'DriverCoupon',
        referenceEntityId: coupon.id,
        description: `Driver ${profile.id} redeemed coupon ${coupon.code}`,
        postings: [
          {
            accountCode: LEDGER_ACCOUNT_CODES.DRIVER_COUPON_EXPENSE,
            debitAmount: creditAmount.toFixed(4),
            creditAmount: '0',
          },
          {
            accountCode: LEDGER_ACCOUNT_CODES.DRIVER_PAYABLE,
            debitAmount: '0',
            creditAmount: creditAmount.toFixed(4),
          },
        ],
      },
      tx,
    );

    await applyWalletChange(
      {
        driverProfileId: profile.id,
        financialTransactionId: financialTransaction.id,
        changeType: 'COUPON_REDEEMED',
        availableDelta: creditAmount.toFixed(4),
      },
      tx,
    );

    await tx.driverCoupon.update({
      where: { id: coupon.id },
      data: { totalUsageCount: { increment: 1 } },
    });

    let redemption;
    try {
      redemption = await tx.driverCouponRedemption.create({
        data: {
          driverCouponId: coupon.id,
          driverProfileId: profile.id,
          creditAmountSnapshot: creditAmount.toFixed(4),
          financialTransactionId: financialTransaction.id,
        },
      });
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new DriverCouponAlreadyRedeemedError(coupon.code);
      }
      throw err;
    }

    await recordAuditLog(tx, {
      actorUserId: driverUserId,
      action: 'driver_coupon.redeemed',
      entityType: 'DriverCoupon',
      entityId: coupon.id,
      beforeState: null,
      afterState: { driverProfileId: profile.id, creditAmount: creditAmount.toFixed(4) },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.wallet.updated',
      aggregateType: 'DriverWallet',
      aggregateId: profile.id,
      payload: { driverProfileId: profile.id, changeType: 'COUPON_REDEEMED' },
    });

    return redemption;
  });

  await triggerImmediateOutboxDispatch(db);

  return {
    id: result.id,
    driverCouponId: result.driverCouponId,
    driverProfileId: result.driverProfileId,
    creditAmountSnapshot: result.creditAmountSnapshot.toFixed(4),
    createdAt: result.createdAt.toISOString(),
  };
}

/**
 * Discovery list for the driver-facing "Redeem a coupon" surface: every
 * currently-usable (ACTIVE, within its date window, under its usage limit)
 * coupon this driver has not already redeemed. Unlocked reads only — the
 * authoritative, concurrency-safe check happens again under a row lock
 * inside redeemDriverCoupon at actual redemption time.
 */
export async function listActiveDriverCouponsForDriver(
  driverUserId: string,
  db: Db = prisma,
): Promise<DriverCouponSummary[]> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);
  const now = new Date();

  const candidates = await db.driverCoupon.findMany({
    where: {
      status: 'ACTIVE',
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      redemptions: { none: { driverProfileId: profile.id } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return candidates
    .filter(
      (c) =>
        isDriverCouponCurrentlyUsable(c.status, c.startsAt, c.endsAt, now) &&
        (c.totalUsageLimit === null || c.totalUsageCount < c.totalUsageLimit),
    )
    .map((c) => mapDriverCouponToSummary(c, now));
}
