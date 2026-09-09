import 'server-only';
import type { DriverSettlement } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { getBoolean, getString } from '@/shared/config/configuration-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { postFinancialTransaction } from './ledger-service';
import { applyWalletChange } from './wallet-service';
import { validateSettlementStatusTransition } from '../../domain/settlement-state-machine';
import { LEDGER_ACCOUNT_CODES } from '../../domain/ledger-accounts';
import { roundMoney, toDecimal } from '../../domain/money';
import {
  DriverWalletNotFoundError,
  InsufficientAvailableBalanceError,
  SettlementBelowMinimumAmountError,
  SettlementNotFoundError,
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

  return db.$transaction(async (tx: Db) => {
    const settlement = await tx.driverSettlement.create({
      data: {
        driverProfileId: input.driverProfileId,
        driverWalletId: wallet.id,
        amount: roundMoney(amount).toFixed(4),
        status: 'PENDING',
        payoutProvider: 'manual',
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
      afterState: { amount: settlement.amount.toFixed(4), driverProfileId: input.driverProfileId },
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
}

async function loadSettlementOrThrow(settlementId: string, db: Db): Promise<DriverSettlement> {
  const settlement = await db.driverSettlement.findUnique({ where: { id: settlementId } });
  if (!settlement) {
    throw new SettlementNotFoundError(settlementId);
  }
  return settlement;
}

/** Admin marks a reserved settlement as actively being paid out. */
export async function startProcessingSettlement(
  actorUserId: string,
  settlementId: string,
  db: Db = prisma,
): Promise<SettlementSummary> {
  return db.$transaction(async (tx: Db) => {
    const settlement = await loadSettlementOrThrow(settlementId, tx);
    if (settlement.status === 'PROCESSING') {
      return mapSettlementToSummary(settlement);
    }
    validateSettlementStatusTransition(settlement.status, 'PROCESSING');

    const updated = await tx.driverSettlement.update({
      where: { id: settlementId },
      data: { status: 'PROCESSING', initiatedAt: new Date(), processedBy: actorUserId },
    });

    await recordAuditLog(tx, {
      actorUserId,
      action: 'finance.settlement.processing',
      entityType: 'DriverSettlement',
      entityId: settlementId,
      beforeState: { status: settlement.status },
      afterState: { status: 'PROCESSING' },
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

export async function listAllSettlements(db: Db = prisma): Promise<SettlementSummary[]> {
  const settlements = await db.driverSettlement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return settlements.map(mapSettlementToSummary);
}

/** Resolves the caller's own driver profile, then returns their settlement history. */
export async function listOwnDriverSettlements(
  driverUserId: string,
  db: Db = prisma,
): Promise<SettlementSummary[]> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);
  return listDriverSettlements(profile.id, db);
}
