import 'server-only';
import type { DriverSettlement, SettlementStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { getBoolean, getString } from '@/shared/config/configuration-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { postFinancialTransaction } from './ledger-service';
import { applyWalletChange } from './wallet-service';
import { validateSettlementStatusTransition } from '../../domain/settlement-state-machine';
import { LEDGER_ACCOUNT_CODES } from '../../domain/ledger-accounts';
import { roundMoney, toDecimal, toMinorUnits } from '../../domain/money';
import { payoutProvider } from '../../infrastructure/payout-provider';
import { Prisma } from '@prisma/client';
import {
  DriverWalletNotFoundError,
  DuplicateActiveSettlementError,
  InsufficientAvailableBalanceError,
  SettlementBelowMinimumAmountError,
  SettlementNotFoundError,
  SettlementNotRetryableError,
  SettlementsDisabledError,
} from '../../domain/errors';

export interface SettlementSummary {
  id: string;
  driverProfileId: string;
  amount: string;
  amountPaid: string | null;
  status: DriverSettlement['status'];
  payoutProvider: string | null;
  payoutReference: string | null;
  failureReason: string | null;
  initiatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

function mapSettlementToSummary(settlement: DriverSettlement): SettlementSummary {
  return {
    id: settlement.id,
    driverProfileId: settlement.driverProfileId,
    amount: settlement.amount.toFixed(4),
    amountPaid: settlement.amountPaid ? settlement.amountPaid.toFixed(4) : null,
    status: settlement.status,
    payoutProvider: settlement.payoutProvider,
    payoutReference: settlement.payoutReference,
    failureReason: settlement.failureReason,
    initiatedAt: settlement.initiatedAt ? settlement.initiatedAt.toISOString() : null,
    completedAt: settlement.completedAt ? settlement.completedAt.toISOString() : null,
    createdAt: settlement.createdAt.toISOString(),
  };
}

export interface CreateSettlementInput {
  driverProfileId: string;
  /** Omit to settle the driver's full current available balance. */
  amount?: string;
}

/**
 * Creates a settlement (an admin/system decision to pay a driver out) and
 * immediately reserves the funds: moves the requested amount from
 * availableBalance to reservedBalance and posts DRIVER_PAYABLE ->
 * SETTLEMENT_CLEARING. There is no automated payout provider configured yet
 * (see Part I) — payoutProvider is always "manual" in this phase; an admin
 * marks the settlement PROCESSING then PAID once they've actually paid the
 * driver (e.g. by bank transfer), or FAILED if that falls through, which
 * releases the reservation. This is the only way funds move out of
 * availableBalance — there is no direct "mark paid" API.
 */
export async function createSettlement(
  actorUserId: string,
  input: CreateSettlementInput,
  db: Db = prisma,
): Promise<SettlementSummary> {
  const settlementsEnabled = await getBoolean('finance.settlement.enabled', true, db);
  if (!settlementsEnabled) {
    throw new SettlementsDisabledError();
  }

  const wallet = await db.driverWallet.findUnique({
    where: { driverProfileId: input.driverProfileId },
  });
  if (!wallet) {
    throw new DriverWalletNotFoundError(input.driverProfileId);
  }

  // Fast, friendly pre-check. Not itself race-safe against a concurrent
  // request (there's nothing to lock on the absence of a row) — the
  // partial unique index (driver_settlements_one_active_per_driver,
  // migration 20260909000007) is the authoritative guarantee, caught below.
  const existingActive = await db.driverSettlement.findFirst({
    where: { driverProfileId: input.driverProfileId, status: { in: ['PENDING', 'PROCESSING'] } },
  });
  if (existingActive) {
    throw new DuplicateActiveSettlementError(input.driverProfileId);
  }

  const availableBalance = toDecimal(wallet.availableBalance);
  const amount = input.amount ? toDecimal(input.amount) : availableBalance;

  const minimumAmountRaw = await getString('finance.settlement.minimum_amount', '500.0000', db);
  const minimumAmount = toDecimal(minimumAmountRaw);
  if (amount.lessThan(minimumAmount)) {
    throw new SettlementBelowMinimumAmountError(amount.toFixed(4), minimumAmount.toFixed(4));
  }
  if (amount.greaterThan(availableBalance)) {
    throw new InsufficientAvailableBalanceError(amount.toFixed(4), availableBalance.toFixed(4));
  }

  try {
    return await db.$transaction(async (tx: Db) => {
      const settlement = await tx.driverSettlement.create({
        data: {
          driverProfileId: input.driverProfileId,
          driverWalletId: wallet.id,
          amount: roundMoney(amount).toFixed(4),
          status: 'PENDING',
          // Not yet known — set when startProcessingSettlement actually
          // invokes a payout provider (see infrastructure/payout-provider.ts).
          payoutProvider: null,
          requestedBy: actorUserId,
        },
      });

      const financialTransaction = await postFinancialTransaction(
        {
          transactionType: 'SETTLEMENT_CREATED',
          referenceEntityType: 'DriverSettlement',
          referenceEntityId: settlement.id,
          idempotencyKey: `settlement_created:${settlement.id}`,
          description: `Settlement reserved for driver ${input.driverProfileId}`,
          postings: [
            {
              accountCode: LEDGER_ACCOUNT_CODES.DRIVER_PAYABLE,
              debitAmount: roundMoney(amount).toFixed(4),
              creditAmount: '0',
            },
            {
              accountCode: LEDGER_ACCOUNT_CODES.SETTLEMENT_CLEARING,
              debitAmount: '0',
              creditAmount: roundMoney(amount).toFixed(4),
            },
          ],
        },
        tx,
      );

      await applyWalletChange(
        {
          driverProfileId: input.driverProfileId,
          financialTransactionId: financialTransaction.id,
          changeType: 'SETTLEMENT_RESERVED',
          availableDelta: roundMoney(amount).mul(-1).toFixed(4),
          reservedDelta: roundMoney(amount).toFixed(4),
        },
        tx,
      );

      const updated = await tx.driverSettlement.update({
        where: { id: settlement.id },
        data: { financialTransactionId: financialTransaction.id },
      });

      await recordAuditLog(tx, {
        actorUserId,
        action: 'finance.settlement.created',
        entityType: 'DriverSettlement',
        entityId: settlement.id,
        beforeState: null,
        afterState: {
          amount: settlement.amount.toFixed(4),
          driverProfileId: input.driverProfileId,
        },
        requestMetadata: null,
      });

      await insertOutboxEvent(tx, {
        eventType: 'settlement.created',
        aggregateType: 'DriverSettlement',
        aggregateId: settlement.id,
        payload: {
          settlementId: settlement.id,
          driverProfileId: input.driverProfileId,
          amount: settlement.amount.toFixed(4),
        },
      });

      return mapSettlementToSummary(updated);
    });
  } catch (err: unknown) {
    // Authoritative guarantee: driver_settlements_one_active_per_driver
    // (migration 20260909000007). The pre-check above closes the common
    // case with a friendly error; this catches the rare race the pre-check
    // cannot (two concurrent requests both passing the check).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new DuplicateActiveSettlementError(input.driverProfileId);
    }
    throw err;
  }
}

async function loadSettlementOrThrow(settlementId: string, db: Db): Promise<DriverSettlement> {
  const settlement = await db.driverSettlement.findUnique({ where: { id: settlementId } });
  if (!settlement) {
    throw new SettlementNotFoundError(settlementId);
  }
  return settlement;
}

/**
 * Retries a FAILED settlement. FAILED is a deliberately terminal state in
 * the state machine (see settlement-state-machine.ts's header comment) —
 * failing a settlement already released its reservation back to
 * availableBalance, so "retry" here means creating a brand-new settlement
 * for the same driver/amount through the exact same validated path every
 * settlement goes through (createSettlement), rather than resurrecting the
 * failed row or adding a FAILED -> PENDING transition that would let an
 * operator button bypass the state machine. Idempotency protection comes
 * for free from the one-active-settlement-per-driver constraint: a second
 * concurrent/duplicate retry click hits DuplicateActiveSettlementError from
 * createSettlement, exactly as it would for any other duplicate creation
 * attempt.
 */
export async function retryFailedSettlement(
  actorUserId: string,
  failedSettlementId: string,
  db: Db = prisma,
): Promise<SettlementSummary> {
  const failed = await loadSettlementOrThrow(failedSettlementId, db);
  if (failed.status !== 'FAILED') {
    throw new SettlementNotRetryableError(failedSettlementId, failed.status);
  }

  const retried = await createSettlement(
    actorUserId,
    { driverProfileId: failed.driverProfileId, amount: failed.amount.toFixed(4) },
    db,
  );

  await recordAuditLog(db, {
    actorUserId,
    action: 'finance.settlement.retried',
    entityType: 'DriverSettlement',
    entityId: retried.id,
    beforeState: { retriedFromSettlementId: failedSettlementId, status: 'FAILED' },
    afterState: { status: retried.status, amount: retried.amount },
  });

  await insertOutboxEvent(db, {
    eventType: 'settlement.retried',
    aggregateType: 'DriverSettlement',
    aggregateId: retried.id,
    payload: {
      newSettlementId: retried.id,
      retriedFromSettlementId: failedSettlementId,
      driverProfileId: failed.driverProfileId,
    },
  });

  return retried;
}

/** Admin marks a reserved settlement as actively being paid out. */
export async function startProcessingSettlement(
  actorUserId: string,
  settlementId: string,
  db: Db = prisma,
): Promise<SettlementSummary> {
  const current = await loadSettlementOrThrow(settlementId, db);
  if (current.status === 'PROCESSING') {
    return mapSettlementToSummary(current);
  }
  validateSettlementStatusTransition(current.status, 'PROCESSING');

  // The payout provider call happens outside any DB transaction — same
  // discipline payment-service.ts already uses for its Razorpay createOrder
  // call, so a real (network-bound) provider never holds a transaction open.
  const payoutResult = await payoutProvider.initiatePayout({
    settlementId: current.id,
    driverProfileId: current.driverProfileId,
    amountMinorUnits: toMinorUnits(toDecimal(current.amount)),
    currency: 'INR',
  });

  return db.$transaction(async (tx: Db) => {
    const settlement = await loadSettlementOrThrow(settlementId, tx);
    if (settlement.status === 'PROCESSING') {
      return mapSettlementToSummary(settlement);
    }
    validateSettlementStatusTransition(settlement.status, 'PROCESSING');

    const updated = await tx.driverSettlement.update({
      where: { id: settlementId },
      data: {
        status: 'PROCESSING',
        initiatedAt: new Date(),
        processedBy: actorUserId,
        payoutProvider: payoutResult.providerName,
        payoutReference: payoutResult.payoutReference,
      },
    });

    await recordAuditLog(tx, {
      actorUserId,
      action: 'finance.settlement.processing',
      entityType: 'DriverSettlement',
      entityId: settlementId,
      beforeState: { status: settlement.status },
      afterState: { status: 'PROCESSING', payoutProvider: payoutResult.providerName },
      requestMetadata: null,
    });

    return mapSettlementToSummary(updated);
  });
}

export interface CompleteSettlementInput {
  settlementId: string;
  payoutReference?: string | null;
}

/** Admin confirms the driver has actually been paid (e.g. bank transfer completed). */
export async function completeSettlement(
  actorUserId: string,
  input: CompleteSettlementInput,
  db: Db = prisma,
): Promise<SettlementSummary> {
  return db.$transaction(async (tx: Db) => {
    const settlement = await loadSettlementOrThrow(input.settlementId, tx);
    if (settlement.status === 'PAID') {
      return mapSettlementToSummary(settlement);
    }
    validateSettlementStatusTransition(settlement.status, 'PAID');

    const paidTransaction = await postFinancialTransaction(
      {
        transactionType: 'SETTLEMENT_PAID',
        referenceEntityType: 'DriverSettlement',
        referenceEntityId: settlement.id,
        idempotencyKey: `settlement_paid:${settlement.id}`,
        description: `Settlement paid out for driver ${settlement.driverProfileId}`,
        postings: [
          {
            accountCode: LEDGER_ACCOUNT_CODES.SETTLEMENT_CLEARING,
            debitAmount: settlement.amount.toFixed(4),
            creditAmount: '0',
          },
          {
            accountCode: LEDGER_ACCOUNT_CODES.PLATFORM_BANK_ACCOUNT,
            debitAmount: '0',
            creditAmount: settlement.amount.toFixed(4),
          },
        ],
      },
      tx,
    );

    const updated = await tx.driverSettlement.update({
      where: { id: input.settlementId },
      data: {
        status: 'PAID',
        amountPaid: settlement.amount,
        completedAt: new Date(),
        payoutReference: input.payoutReference ?? null,
        processedBy: actorUserId,
      },
    });

    await applyWalletChange(
      {
        driverProfileId: settlement.driverProfileId,
        financialTransactionId: paidTransaction.id,
        changeType: 'SETTLEMENT_COMPLETED',
        reservedDelta: roundMoney(toDecimal(settlement.amount)).mul(-1).toFixed(4),
        totalSettledDelta: roundMoney(toDecimal(settlement.amount)).toFixed(4),
      },
      tx,
    );

    await recordAuditLog(tx, {
      actorUserId,
      action: 'finance.settlement.completed',
      entityType: 'DriverSettlement',
      entityId: input.settlementId,
      beforeState: { status: settlement.status },
      afterState: { status: 'PAID', amountPaid: settlement.amount.toFixed(4) },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'settlement.completed',
      aggregateType: 'DriverSettlement',
      aggregateId: input.settlementId,
      payload: {
        settlementId: input.settlementId,
        driverProfileId: settlement.driverProfileId,
        amount: settlement.amount.toFixed(4),
      },
    });

    return mapSettlementToSummary(updated);
  });
}

/**
 * Fails (from PROCESSING) or cancels (from PENDING) a settlement, releasing
 * the reserved funds back to availableBalance via an exact reversing
 * FinancialTransaction — the original reservation entries are never edited.
 */
export async function failOrCancelSettlement(
  actorUserId: string,
  settlementId: string,
  targetStatus: 'FAILED' | 'CANCELLED',
  reason: string,
  db: Db = prisma,
): Promise<SettlementSummary> {
  return db.$transaction(async (tx: Db) => {
    const settlement = await loadSettlementOrThrow(settlementId, tx);
    if (settlement.status === targetStatus) {
      return mapSettlementToSummary(settlement);
    }
    validateSettlementStatusTransition(settlement.status, targetStatus);

    const reversalTransaction = await postFinancialTransaction(
      {
        transactionType: 'SETTLEMENT_REVERSED',
        referenceEntityType: 'DriverSettlement',
        referenceEntityId: settlement.id,
        idempotencyKey: `settlement_reversed:${settlement.id}`,
        description: `Settlement ${targetStatus.toLowerCase()} for driver ${settlement.driverProfileId}: ${reason}`,
        reversesTransactionId: settlement.financialTransactionId ?? null,
        postings: [
          {
            accountCode: LEDGER_ACCOUNT_CODES.SETTLEMENT_CLEARING,
            debitAmount: settlement.amount.toFixed(4),
            creditAmount: '0',
          },
          {
            accountCode: LEDGER_ACCOUNT_CODES.DRIVER_PAYABLE,
            debitAmount: '0',
            creditAmount: settlement.amount.toFixed(4),
          },
        ],
      },
      tx,
    );

    await applyWalletChange(
      {
        driverProfileId: settlement.driverProfileId,
        financialTransactionId: reversalTransaction.id,
        changeType: 'SETTLEMENT_RELEASED',
        availableDelta: settlement.amount.toFixed(4),
        reservedDelta: settlement.amount.mul(-1).toFixed(4),
      },
      tx,
    );

    const updated = await tx.driverSettlement.update({
      where: { id: settlementId },
      data: {
        status: targetStatus,
        failureReason: reason,
        reversalFinancialTransactionId: reversalTransaction.id,
        processedBy: actorUserId,
      },
    });

    await recordAuditLog(tx, {
      actorUserId,
      action: `finance.settlement.${targetStatus.toLowerCase()}`,
      entityType: 'DriverSettlement',
      entityId: settlementId,
      beforeState: { status: settlement.status },
      afterState: { status: targetStatus, reason },
      requestMetadata: null,
    });

    if (targetStatus === 'FAILED') {
      await insertOutboxEvent(tx, {
        eventType: 'settlement.failed',
        aggregateType: 'DriverSettlement',
        aggregateId: settlementId,
        payload: { settlementId, driverProfileId: settlement.driverProfileId, reason },
      });
    }

    return mapSettlementToSummary(updated);
  });
}

export async function getSettlementById(
  settlementId: string,
  db: Db = prisma,
): Promise<SettlementSummary> {
  const settlement = await loadSettlementOrThrow(settlementId, db);
  return mapSettlementToSummary(settlement);
}

export async function listDriverSettlements(
  driverProfileId: string,
  db: Db = prisma,
): Promise<SettlementSummary[]> {
  const settlements = await db.driverSettlement.findMany({
    where: { driverProfileId },
    orderBy: { createdAt: 'desc' },
    // Previously unbounded.
    take: 200,
  });
  return settlements.map(mapSettlementToSummary);
}

export interface ListAllSettlementsFilters {
  status?: SettlementStatus;
  driverProfileId?: string;
  page?: number;
  pageSize?: number;
}

export interface ListAllSettlementsResult {
  settlements: SettlementSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAllSettlements(
  filters: ListAllSettlementsFilters = {},
  db: Db = prisma,
): Promise<ListAllSettlementsResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.driverProfileId ? { driverProfileId: filters.driverProfileId } : {}),
  };

  const [settlements, total] = await Promise.all([
    db.driverSettlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.driverSettlement.count({ where }),
  ]);

  return {
    settlements: settlements.map(mapSettlementToSummary),
    total,
    page,
    pageSize,
  };
}

/** Resolves the caller's own driver profile, then returns their settlement history. */
export async function listOwnDriverSettlements(
  driverUserId: string,
  db: Db = prisma,
): Promise<SettlementSummary[]> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);
  return listDriverSettlements(profile.id, db);
}
