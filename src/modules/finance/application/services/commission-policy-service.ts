import 'server-only';
import { ConfigValueType } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getConfiguration, updateConfiguration } from '@/shared/config/configuration-service';
import { listAuditLogs, type ListAuditLogsResult } from '@/shared/audit/audit-service';
import { toDecimal } from '../../domain/money';

/**
 * The one SystemConfiguration key that drives the entire commission split
 * (see pricing-service.ts's calculateCommission) — a single flat platform
 * rate. Deliberately NOT a multi-dimensional "commission matrix" keyed by
 * booking type or driver tier: the repository audit confirmed the domain
 * has no tier/VIP concept on DriverProfile or Booking to hang a
 * differentiated rate on, so building one here would mean inventing
 * speculative dimensions nothing else in the app uses. This is the
 * smallest correct production model for what the domain actually supports
 * today; see the Phase 19 report for the full reasoning.
 */
const COMMISSION_RATE_CONFIG_KEY = 'finance.platform_commission_percentage';
const DEFAULT_COMMISSION_PERCENTAGE = '20.0000';

export interface CommissionPolicy {
  percentage: string;
  updatedAt: string;
  updatedBy: string | null;
}

/**
 * Reads the current commission policy. This is a read of live
 * configuration, not a historical record — every Payment already freezes
 * the rate that applied *to it* at capture time in
 * Payment.commissionPercentageSnapshot (see payment-service.ts), so a
 * change here is guaranteed to never retroactively alter an already-
 * captured payment's split. That snapshot, not a new model, is what
 * satisfies "commission snapshot immutability" for Phase 19 — see the
 * Phase 19 report.
 */
export async function getCommissionPolicy(db: Db = prisma): Promise<CommissionPolicy> {
  const config = await getConfiguration(COMMISSION_RATE_CONFIG_KEY, db);
  return {
    percentage: config?.value ?? DEFAULT_COMMISSION_PERCENTAGE,
    updatedAt: (config?.updatedAt ?? config?.createdAt ?? new Date()).toISOString(),
    updatedBy: config?.updatedBy ?? null,
  };
}

export class InvalidCommissionPercentageError extends Error {
  constructor(value: string) {
    super(`Commission percentage must be a number between 0 and 100, got: ${value}`);
    this.name = 'InvalidCommissionPercentageError';
  }
}

/**
 * Updates the commission policy. Fully delegates to the existing generic
 * configuration-update path (updateConfiguration) — which already performs
 * the write, Redis cache invalidation, audit log, and outbox event
 * atomically — rather than writing SystemConfiguration directly, per the
 * "reuse existing service" rule. The audit trail this produces (queryable
 * via getCommissionPolicyHistory) is this policy's change history; no
 * separate CommissionPolicy model was introduced.
 */
export async function updateCommissionPolicy(
  actorUserId: string,
  percentage: string,
  requestMetadata?: Record<string, unknown> | null,
  db: Db = prisma,
): Promise<CommissionPolicy> {
  let decimal;
  try {
    decimal = toDecimal(percentage);
  } catch {
    throw new InvalidCommissionPercentageError(percentage);
  }
  if (decimal.lessThan(0) || decimal.greaterThan(100)) {
    throw new InvalidCommissionPercentageError(percentage);
  }

  const updated = await updateConfiguration(
    actorUserId,
    {
      key: COMMISSION_RATE_CONFIG_KEY,
      value: decimal.toFixed(4),
      valueType: ConfigValueType.DECIMAL,
      category: 'finance',
      description: 'Platform commission percentage taken from each captured booking payment',
    },
    requestMetadata,
    db,
  );

  return {
    percentage: updated.value,
    updatedAt: updated.updatedAt.toISOString(),
    updatedBy: updated.updatedBy,
  };
}

/** The commission rate's change history, sourced from the existing audit log — no separate versioned model. */
export async function getCommissionPolicyHistory(
  pagination: { page?: number; pageSize?: number } = {},
  db: Db = prisma,
): Promise<ListAuditLogsResult> {
  const configRow = await db.systemConfiguration.findUnique({
    where: { key: COMMISSION_RATE_CONFIG_KEY },
  });
  if (!configRow) {
    return { entries: [], total: 0, page: 1, pageSize: pagination.pageSize ?? 20 };
  }

  return listAuditLogs(
    {
      entityType: 'SystemConfiguration',
      entityId: configRow.id,
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    db,
  );
}
