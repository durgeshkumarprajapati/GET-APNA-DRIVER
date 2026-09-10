import 'server-only';
import {
  Prisma,
  type Promotion,
  type PromotionDiscountType,
  type PromotionStatus,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { toDecimal, ZERO } from '@/modules/finance/domain/money';
import {
  isPromotionEditable,
  validatePromotionStatusTransition,
} from '../../domain/promotion-state-machine';
import {
  InvalidPromotionConfigError,
  PromotionCodeAlreadyExistsError,
  PromotionNotEditableError,
  PromotionNotFoundError,
} from '../../domain/errors';
import type {
  PromotionAnalytics,
  PromotionSummary,
  PromotionUsageSummary,
} from '../../domain/types';

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

export interface PromotionConfigInput {
  code?: string | null;
  name: string;
  description?: string | null;
  discountType: PromotionDiscountType;
  discountValue: string;
  maxDiscountAmount?: string | null;
  minBookingValue?: string | null;
  firstRideOnly?: boolean;
  isAutomatic?: boolean;
  startsAt: string;
  endsAt?: string | null;
  totalUsageLimit?: number | null;
  perUserUsageLimit?: number | null;
}

/**
 * Validates the business rules a promotion's numeric/date configuration
 * must satisfy, independent of whether it's a create or an update. Kept as
 * one function so both paths reject the exact same invalid shapes.
 */
function assertValidPromotionConfig(input: PromotionConfigInput): void {
  if (!input.name.trim()) {
    throw new InvalidPromotionConfigError('Promotion name is required');
  }

  const discountValue = toDecimal(input.discountValue);
  if (discountValue.lessThanOrEqualTo(ZERO)) {
    throw new InvalidPromotionConfigError('Discount value must be greater than zero');
  }
  if (input.discountType === 'PERCENTAGE' && discountValue.greaterThan(100)) {
    throw new InvalidPromotionConfigError('A percentage discount cannot exceed 100');
  }

  if (input.maxDiscountAmount !== null && input.maxDiscountAmount !== undefined) {
    if (toDecimal(input.maxDiscountAmount).lessThanOrEqualTo(ZERO)) {
      throw new InvalidPromotionConfigError('Maximum discount amount must be greater than zero');
    }
  }
  if (input.minBookingValue !== null && input.minBookingValue !== undefined) {
    if (toDecimal(input.minBookingValue).lessThan(ZERO)) {
      throw new InvalidPromotionConfigError('Minimum booking value cannot be negative');
    }
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new InvalidPromotionConfigError('A valid start date is required');
  }
  if (input.endsAt) {
    const endsAt = new Date(input.endsAt);
    if (Number.isNaN(endsAt.getTime())) {
      throw new InvalidPromotionConfigError('End date is invalid');
    }
    if (endsAt <= startsAt) {
      throw new InvalidPromotionConfigError('End date must be after the start date');
    }
  }

  if (
    input.totalUsageLimit !== null &&
    input.totalUsageLimit !== undefined &&
    input.totalUsageLimit < 1
  ) {
    throw new InvalidPromotionConfigError('Total usage limit must be at least 1');
  }
  if (
    input.perUserUsageLimit !== null &&
    input.perUserUsageLimit !== undefined &&
    input.perUserUsageLimit < 1
  ) {
    throw new InvalidPromotionConfigError('Per-user usage limit must be at least 1');
  }

  if (!input.isAutomatic && !input.code) {
    throw new InvalidPromotionConfigError('A non-automatic promotion requires a code');
  }
}

export async function createPromotion(
  actorUserId: string,
  input: PromotionConfigInput,
  db: Db = prisma,
): Promise<PromotionSummary> {
  assertValidPromotionConfig(input);

  try {
    const promotion = await db.promotion.create({
      data: {
        code: input.code ?? null,
        name: input.name.trim(),
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxDiscountAmount: input.maxDiscountAmount ?? null,
        minBookingValue: input.minBookingValue ?? null,
        firstRideOnly: input.firstRideOnly ?? false,
        isAutomatic: input.isAutomatic ?? false,
        status: 'DRAFT',
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        totalUsageLimit: input.totalUsageLimit ?? null,
        perUserUsageLimit: input.perUserUsageLimit === undefined ? 1 : input.perUserUsageLimit,
        createdBy: actorUserId,
      },
    });

    await recordAuditLog(db, {
      actorUserId,
      action: 'promotion.created',
      entityType: 'Promotion',
      entityId: promotion.id,
      beforeState: null,
      afterState: { name: promotion.name, code: promotion.code, status: promotion.status },
      requestMetadata: null,
    });

    return mapPromotionToSummary(promotion);
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new PromotionCodeAlreadyExistsError(input.code ?? '');
    }
    throw err;
  }
}

async function loadPromotionOrThrow(promotionId: string, db: Db): Promise<Promotion> {
  const promotion = await db.promotion.findUnique({ where: { id: promotionId } });
  if (!promotion) {
    throw new PromotionNotFoundError(promotionId);
  }
  return promotion;
}

/** Only a DRAFT promotion (never yet activated, therefore never yet redeemed) may have its terms edited. */
export async function updatePromotion(
  actorUserId: string,
  promotionId: string,
  input: PromotionConfigInput,
  db: Db = prisma,
): Promise<PromotionSummary> {
  const current = await loadPromotionOrThrow(promotionId, db);
  if (!isPromotionEditable(current.status)) {
    throw new PromotionNotEditableError(current.status);
  }
  assertValidPromotionConfig(input);

  try {
    const updated = await db.promotion.update({
      where: { id: promotionId },
      data: {
        code: input.code ?? null,
        name: input.name.trim(),
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxDiscountAmount: input.maxDiscountAmount ?? null,
        minBookingValue: input.minBookingValue ?? null,
        firstRideOnly: input.firstRideOnly ?? false,
        isAutomatic: input.isAutomatic ?? false,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        totalUsageLimit: input.totalUsageLimit ?? null,
        perUserUsageLimit: input.perUserUsageLimit === undefined ? 1 : input.perUserUsageLimit,
      },
    });

    await recordAuditLog(db, {
      actorUserId,
      action: 'promotion.updated',
      entityType: 'Promotion',
      entityId: promotionId,
      beforeState: {
        name: current.name,
        discountValue: current.discountValue.toFixed(4),
        code: current.code,
      },
      afterState: {
        name: updated.name,
        discountValue: updated.discountValue.toFixed(4),
        code: updated.code,
      },
      requestMetadata: null,
    });

    return mapPromotionToSummary(updated);
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new PromotionCodeAlreadyExistsError(input.code ?? '');
    }
    throw err;
  }
}

async function transitionPromotionStatus(
  actorUserId: string,
  promotionId: string,
  targetStatus: PromotionStatus,
  action: string,
  db: Db,
): Promise<PromotionSummary> {
  const current = await loadPromotionOrThrow(promotionId, db);
  validatePromotionStatusTransition(current.status, targetStatus);

  const updated = await db.promotion.update({
    where: { id: promotionId },
    data: { status: targetStatus },
  });

  await recordAuditLog(db, {
    actorUserId,
    action,
    entityType: 'Promotion',
    entityId: promotionId,
    beforeState: { status: current.status },
    afterState: { status: targetStatus },
    requestMetadata: null,
  });

  return mapPromotionToSummary(updated);
}

export async function activatePromotion(
  actorUserId: string,
  promotionId: string,
  db: Db = prisma,
): Promise<PromotionSummary> {
  return transitionPromotionStatus(actorUserId, promotionId, 'ACTIVE', 'promotion.activated', db);
}

export async function pausePromotion(
  actorUserId: string,
  promotionId: string,
  db: Db = prisma,
): Promise<PromotionSummary> {
  return transitionPromotionStatus(actorUserId, promotionId, 'PAUSED', 'promotion.paused', db);
}

export async function archivePromotion(
  actorUserId: string,
  promotionId: string,
  db: Db = prisma,
): Promise<PromotionSummary> {
  return transitionPromotionStatus(actorUserId, promotionId, 'ARCHIVED', 'promotion.archived', db);
}

export async function getPromotionById(
  promotionId: string,
  db: Db = prisma,
): Promise<PromotionSummary> {
  const promotion = await loadPromotionOrThrow(promotionId, db);
  return mapPromotionToSummary(promotion);
}

export interface ListPromotionsFilters {
  status?: PromotionStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListPromotionsResult {
  promotions: PromotionSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listPromotions(
  filters: ListPromotionsFilters = {},
  db: Db = prisma,
): Promise<ListPromotionsResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.PromotionWhereInput = {
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

  const [promotions, total] = await Promise.all([
    db.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.promotion.count({ where }),
  ]);

  return { promotions: promotions.map((p) => mapPromotionToSummary(p)), total, page, pageSize };
}

export interface ListPromotionUsagesResult {
  usages: PromotionUsageSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listPromotionUsages(
  promotionId: string,
  pagination: { page?: number; pageSize?: number } = {},
  db: Db = prisma,
): Promise<ListPromotionUsagesResult> {
  await loadPromotionOrThrow(promotionId, db);

  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize =
    pagination.pageSize && pagination.pageSize > 0 ? Math.min(pagination.pageSize, 100) : 25;

  const [usages, total] = await Promise.all([
    db.promotionUsage.findMany({
      where: { promotionId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.promotionUsage.count({ where: { promotionId } }),
  ]);

  return {
    usages: usages.map((u) => ({
      id: u.id,
      promotionId: u.promotionId,
      userId: u.userId,
      bookingId: u.bookingId,
      discountAmount: u.discountAmount.toFixed(4),
      promotionCodeSnapshot: u.promotionCodeSnapshot,
      discountTypeSnapshot: u.discountTypeSnapshot,
      discountValueSnapshot: u.discountValueSnapshot.toFixed(4),
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

/**
 * Real, DB-aggregated metrics only — no conversion-rate or "views vs
 * redemptions" figure, since nothing in this domain records how many
 * customers ever saw an offer (only that they redeemed one), so that ratio
 * cannot be correctly calculated.
 */
export async function getPromotionAnalytics(db: Db = prisma): Promise<PromotionAnalytics> {
  const [totalPromotions, activePromotions, usageAggregate] = await Promise.all([
    db.promotion.count(),
    db.promotion.count({ where: { status: 'ACTIVE' } }),
    db.promotionUsage.aggregate({ _count: true, _sum: { discountAmount: true } }),
  ]);

  return {
    totalPromotions,
    activePromotions,
    totalRedemptions: usageAggregate._count,
    totalDiscountAmount: toDecimal(usageAggregate._sum.discountAmount ?? ZERO).toFixed(4),
    generatedAt: new Date().toISOString(),
  };
}
