import 'server-only';
import { BookingType, DynamicPricingPolicyStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';
import type { DynamicPricingPolicyDTO } from '../domain/pricing-pressure-types';

export interface CreatePricingPolicyInput {
  name: string;
  description?: string | null;
  bookingType?: BookingType | null;
  zoneId?: string | null;
  minimumPressure?: string;
  maximumPressure?: string;
  adjustmentPercentage: number;
  maxAdjustmentPercentage?: number;
  flatSurgeAmount?: number;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
  createdBy?: string | null;
}

export interface UpdatePricingPolicyInput {
  name?: string;
  description?: string | null;
  status?: DynamicPricingPolicyStatus;
  adjustmentPercentage?: number;
  maxAdjustmentPercentage?: number;
  flatSurgeAmount?: number;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
}

function mapToDTO(record: {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: DynamicPricingPolicyStatus;
  bookingType: BookingType | null;
  zoneId: string | null;
  minimumPressure: string;
  maximumPressure: string;
  adjustmentPercentage: unknown;
  maxAdjustmentPercentage: unknown;
  flatSurgeAmount: unknown;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
}): DynamicPricingPolicyDTO {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    version: record.version,
    status: record.status,
    bookingType: record.bookingType,
    zoneId: record.zoneId,
    minimumPressure: record.minimumPressure as DynamicPricingPolicyDTO['minimumPressure'],
    maximumPressure: record.maximumPressure as DynamicPricingPolicyDTO['maximumPressure'],
    adjustmentPercentage: Number(record.adjustmentPercentage),
    maxAdjustmentPercentage: Number(record.maxAdjustmentPercentage),
    flatSurgeAmount: Number(record.flatSurgeAmount),
    effectiveFrom: record.effectiveFrom,
    effectiveUntil: record.effectiveUntil,
  };
}

export async function findActivePricingPolicy(
  bookingType?: BookingType | null,
  zoneId?: string | null,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<DynamicPricingPolicyDTO | null> {
  if (!db.dynamicPricingPolicy?.findFirst) {
    return null;
  }

  const record = await db.dynamicPricingPolicy.findFirst({
    where: {
      status: DynamicPricingPolicyStatus.ACTIVE,
      OR: [{ bookingType: null }, { bookingType: bookingType ?? undefined }],
      AND: [
        { OR: [{ zoneId: null }, { zoneId: zoneId ?? undefined }] },
        { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
        { OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }] },
      ],
    },
    orderBy: [{ bookingType: 'desc' }, { createdAt: 'desc' }],
  });

  return record ? mapToDTO(record) : null;
}

export async function createPricingPolicy(
  input: CreatePricingPolicyInput,
  db: Db = prisma,
): Promise<DynamicPricingPolicyDTO> {
  const record = await db.dynamicPricingPolicy.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      status: DynamicPricingPolicyStatus.DRAFT,
      bookingType: input.bookingType ?? null,
      zoneId: input.zoneId ?? null,
      minimumPressure: input.minimumPressure ?? 'NORMAL',
      maximumPressure: input.maximumPressure ?? 'CRITICAL',
      adjustmentPercentage: input.adjustmentPercentage,
      maxAdjustmentPercentage: input.maxAdjustmentPercentage ?? 50.0,
      flatSurgeAmount: input.flatSurgeAmount ?? 0,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveUntil: input.effectiveUntil ?? null,
      createdBy: input.createdBy ?? null,
    },
  });

  return mapToDTO(record);
}

export async function updatePricingPolicyStatus(
  policyId: string,
  newStatus: DynamicPricingPolicyStatus,
  db: Db = prisma,
): Promise<DynamicPricingPolicyDTO> {
  const lockKey = `dynamic-pricing:lock:activate:${policyId}`;
  let lockAcquired = false;

  try {
    if (newStatus === DynamicPricingPolicyStatus.ACTIVE) {
      lockAcquired = await RedisLockService.acquireLock(lockKey, 5000);
    }

    if (db.$transaction) {
      return await db.$transaction(async (tx) => {
        const existing = await tx.dynamicPricingPolicy.findUnique({ where: { id: policyId } });
        if (!existing) {
          throw new Error(`Pricing policy not found: ${policyId}`);
        }

        if (
          existing.status === DynamicPricingPolicyStatus.ARCHIVED &&
          newStatus === DynamicPricingPolicyStatus.ACTIVE
        ) {
          throw new Error('Archived pricing policies cannot be activated.');
        }

        if (newStatus === DynamicPricingPolicyStatus.ACTIVE) {
          await tx.dynamicPricingPolicy.updateMany({
            where: {
              status: DynamicPricingPolicyStatus.ACTIVE,
              id: { not: policyId },
              bookingType: existing.bookingType,
              zoneId: existing.zoneId,
            },
            data: { status: DynamicPricingPolicyStatus.PAUSED },
          });
        }

        const record = await tx.dynamicPricingPolicy.update({
          where: { id: policyId },
          data: {
            status: newStatus,
            version: { increment: 1 },
          },
        });

        return mapToDTO(record);
      });
    }

    // Mock DB fallback for unit tests
    const existing = await db.dynamicPricingPolicy.findUnique({ where: { id: policyId } });
    if (!existing) {
      throw new Error(`Pricing policy not found: ${policyId}`);
    }

    if (
      existing.status === DynamicPricingPolicyStatus.ARCHIVED &&
      newStatus === DynamicPricingPolicyStatus.ACTIVE
    ) {
      throw new Error('Archived pricing policies cannot be activated.');
    }

    const record = await db.dynamicPricingPolicy.update({
      where: { id: policyId },
      data: {
        status: newStatus,
        version: { increment: 1 },
      },
    });

    return mapToDTO(record);
  } finally {
    if (lockAcquired) {
      await RedisLockService.releaseLock(lockKey);
    }
  }
}

export async function listPricingPolicies(
  db: Db = prisma,
): Promise<DynamicPricingPolicyDTO[]> {
  const records = await db.dynamicPricingPolicy.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return records.map(mapToDTO);
}
