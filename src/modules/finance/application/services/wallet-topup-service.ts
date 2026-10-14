import 'server-only';
import type { DriverWalletTopup } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getString } from '@/shared/config/configuration-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent, triggerImmediateOutboxDispatch } from '@/shared/outbox/outbox-service';
import { env } from '@/shared/config/env';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { paymentProvider } from '../../infrastructure/payment-provider';
import { postFinancialTransaction } from './ledger-service';
import { applyWalletChange } from './wallet-service';
import { LEDGER_ACCOUNT_CODES } from '../../domain/ledger-accounts';
import {
  ZERO,
  fromMinorUnits,
  isNegative,
  roundMoney,
  toDecimal,
  toMinorUnits,
} from '../../domain/money';
import {
  NoWalletDebtOwedError,
  PaymentProviderError,
  PaymentVerificationFailedError,
  WalletTopupExceedsDebtError,
  WalletTopupNotFoundError,
} from '../../domain/errors';

const TERMINAL_TOPUP_STATUSES = ['CAPTURED', 'CANCELLED'] as const;

export interface WalletTopupCheckoutInit {
  topupId: string;
  providerOrderId: string;
  amount: string;
  currency: string;
  razorpayKeyId: string | null;
}

export interface WalletTopupSummary {
  id: string;
  driverProfileId: string;
  status: DriverWalletTopup['status'];
  amount: string;
  currency: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  capturedAt: string | null;
  createdAt: string;
}

function mapTopupToSummary(topup: DriverWalletTopup): WalletTopupSummary {
  return {
    id: topup.id,
    driverProfileId: topup.driverProfileId,
    status: topup.status,
    amount: topup.amount.toFixed(4),
    currency: topup.currency,
    providerOrderId: topup.providerOrderId ?? null,
    providerPaymentId: topup.providerPaymentId ?? null,
    capturedAt: topup.capturedAt ? topup.capturedAt.toISOString() : null,
    createdAt: topup.createdAt.toISOString(),
  };
}

function toCheckoutInit(topup: DriverWalletTopup): WalletTopupCheckoutInit {
  if (!topup.providerOrderId) {
    throw new PaymentProviderError('Wallet top-up has no provider order reference yet');
  }
  return {
    topupId: topup.id,
    providerOrderId: topup.providerOrderId,
    amount: topup.amount.toFixed(4),
    currency: topup.currency,
    razorpayKeyId: env.RAZORPAY_KEY_ID ?? null,
  };
}

export interface CreateWalletDebtTopupOrderInput {
  /** Omit to pay down the full outstanding debt. */
  amount?: string;
}

/**
 * Step 1 of the debt-repayment flow: validates the requested amount against
 * the driver's actual outstanding debt (the negative portion of
 * DriverWallet.availableBalance), creates the DriverWalletTopup record, and
 * creates the matching Razorpay order. Mirrors createPaymentForBooking in
 * payment-service.ts, minus the booking — this is not tied to one.
 */
export async function createWalletDebtTopupOrder(
  driverUserId: string,
  input: CreateWalletDebtTopupOrderInput,
  db: Db = prisma,
): Promise<WalletTopupCheckoutInit> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);
  const wallet = await db.driverWallet.findUnique({ where: { driverProfileId: profile.id } });
  const availableBalance = wallet ? toDecimal(wallet.availableBalance) : ZERO;

  if (!isNegative(availableBalance)) {
    throw new NoWalletDebtOwedError();
  }
  const debtOwed = roundMoney(availableBalance.neg());

  const amount = input.amount ? roundMoney(toDecimal(input.amount)) : debtOwed;
  if (amount.lessThanOrEqualTo(ZERO) || amount.greaterThan(debtOwed)) {
    throw new WalletTopupExceedsDebtError(amount.toFixed(4), debtOwed.toFixed(4));
  }

  const currency = await getString('finance.currency', 'INR', db);

  const topup = await db.driverWalletTopup.create({
    data: {
      driverProfileId: profile.id,
      amount: amount.toFixed(4),
      currency,
      status: 'CREATED',
    },
  });

  await recordAuditLog(db, {
    actorUserId: driverUserId,
    action: 'finance.wallet_topup.created',
    entityType: 'DriverWalletTopup',
    entityId: topup.id,
    beforeState: null,
    afterState: { status: topup.status, amount: amount.toFixed(4) },
    requestMetadata: null,
  });

  let providerOrderId: string;
  try {
    const order = await paymentProvider.createOrder({
      amountMinorUnits: toMinorUnits(amount),
      currency,
      receipt: topup.id,
      notes: { driverProfileId: profile.id, topupId: topup.id, purpose: 'wallet_debt_repayment' },
    });
    providerOrderId = order.providerOrderId;
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Unknown provider error';
    await db.driverWalletTopup.update({
      where: { id: topup.id },
      data: { status: 'FAILED', failureReason: reason },
    });
    throw new PaymentProviderError(reason);
  }

  const updated = await db.driverWalletTopup.update({
    where: { id: topup.id },
    data: { providerOrderId, status: 'PROCESSING' },
  });

  return toCheckoutInit(updated);
}

export interface VerifyWalletTopupInput {
  topupId: string;
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

/**
 * Step 2: server-side verification of the client's checkout-completion
 * callback. Never trusts the client alone — independently verifies the HMAC
 * signature and fetches the payment from Razorpay before treating it as
 * captured. Mirrors verifyAndCapturePayment in payment-service.ts.
 */
export async function verifyAndCaptureWalletTopup(
  driverUserId: string,
  input: VerifyWalletTopupInput,
  db: Db = prisma,
): Promise<WalletTopupSummary> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);
  const topup = await db.driverWalletTopup.findUnique({ where: { id: input.topupId } });
  if (!topup || topup.driverProfileId !== profile.id) {
    throw new WalletTopupNotFoundError(input.topupId);
  }

  if (topup.status === 'CAPTURED') {
    return mapTopupToSummary(topup);
  }
  if (topup.providerOrderId !== input.providerOrderId) {
    throw new PaymentVerificationFailedError('Order reference does not match this wallet top-up');
  }

  const signatureValid = paymentProvider.verifyPaymentSignature({
    providerOrderId: input.providerOrderId,
    providerPaymentId: input.providerPaymentId,
    signature: input.signature,
  });
  if (!signatureValid) {
    throw new PaymentVerificationFailedError('Invalid payment signature');
  }

  let providerPayment = await paymentProvider.fetchPayment(input.providerPaymentId);
  if (providerPayment.status === 'authorized' && paymentProvider.capturePaymentOnProvider) {
    providerPayment = await paymentProvider.capturePaymentOnProvider(
      input.providerPaymentId,
      providerPayment.amountMinorUnits,
      providerPayment.currency,
    );
  }
  if (providerPayment.status !== 'captured') {
    throw new PaymentVerificationFailedError(
      `Provider reports payment status: ${providerPayment.status}`,
    );
  }

  return captureWalletTopup(
    {
      topupId: topup.id,
      providerPaymentId: input.providerPaymentId,
      amountMinorUnits: providerPayment.amountMinorUnits,
      source: 'client_verify',
    },
    db,
  );
}

export interface CaptureWalletTopupInput {
  topupId: string;
  providerPaymentId: string;
  amountMinorUnits: number;
  source: 'client_verify' | 'webhook';
}

/**
 * The single place that finalizes a captured wallet top-up: posts the
 * balanced FinancialTransaction (real money the driver paid in -> clears
 * their debt), credits the wallet, writes the audit trail. Idempotent —
 * calling it twice for an already-CAPTURED top-up (webhook and
 * client-verify racing) is a safe no-op, same guarantee applyWalletChange
 * already provides via its financialTransactionId uniqueness.
 */
export async function captureWalletTopup(
  input: CaptureWalletTopupInput,
  db: Db = prisma,
): Promise<WalletTopupSummary> {
  const result = await db.$transaction(async (tx: Db) => {
    const topup = await tx.driverWalletTopup.findUnique({ where: { id: input.topupId } });
    if (!topup) {
      throw new WalletTopupNotFoundError(input.topupId);
    }
    if (
      TERMINAL_TOPUP_STATUSES.includes(topup.status as (typeof TERMINAL_TOPUP_STATUSES)[number])
    ) {
      return mapTopupToSummary(topup);
    }

    const amountFromProvider = fromMinorUnits(input.amountMinorUnits);
    if (!roundMoney(amountFromProvider).equals(roundMoney(toDecimal(topup.amount)))) {
      throw new PaymentVerificationFailedError(
        `Captured amount ${amountFromProvider.toFixed(4)} does not match expected amount ${topup.amount.toFixed(4)}`,
      );
    }

    const capturedAt = new Date();
    const financialTransaction = await postFinancialTransaction(
      {
        transactionType: 'DRIVER_DEBT_REPAID',
        referenceEntityType: 'DriverWalletTopup',
        referenceEntityId: topup.id,
        idempotencyKey: `wallet_topup_captured:${topup.id}`,
        description: `Driver ${topup.driverProfileId} paid down wallet debt`,
        postings: [
          {
            accountCode: LEDGER_ACCOUNT_CODES.PAYMENT_PROVIDER_CLEARING,
            debitAmount: topup.amount.toFixed(4),
            creditAmount: '0',
          },
          {
            accountCode: LEDGER_ACCOUNT_CODES.DRIVER_PAYABLE,
            debitAmount: '0',
            creditAmount: topup.amount.toFixed(4),
          },
        ],
      },
      tx,
    );

    const updated = await tx.driverWalletTopup.update({
      where: { id: topup.id },
      data: {
        status: 'CAPTURED',
        providerPaymentId: input.providerPaymentId,
        financialTransactionId: financialTransaction.id,
        capturedAt,
      },
    });

    await applyWalletChange(
      {
        driverProfileId: topup.driverProfileId,
        financialTransactionId: financialTransaction.id,
        changeType: 'DEBT_REPAYMENT',
        availableDelta: topup.amount.toFixed(4),
      },
      tx,
    );

    await recordAuditLog(tx, {
      actorUserId: null,
      action: 'finance.wallet_topup.captured',
      entityType: 'DriverWalletTopup',
      entityId: topup.id,
      beforeState: { status: topup.status },
      afterState: { status: 'CAPTURED', amount: topup.amount.toFixed(4) },
      requestMetadata: { source: input.source },
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.wallet.updated',
      aggregateType: 'DriverWallet',
      aggregateId: topup.driverProfileId,
      payload: { driverProfileId: topup.driverProfileId, changeType: 'DEBT_REPAYMENT' },
    });

    return mapTopupToSummary(updated);
  });

  await triggerImmediateOutboxDispatch(db);
  return result;
}

export async function markWalletTopupFailed(
  topupId: string,
  reason: string,
  db: Db = prisma,
): Promise<WalletTopupSummary> {
  const topup = await db.driverWalletTopup.findUnique({ where: { id: topupId } });
  if (!topup) {
    throw new WalletTopupNotFoundError(topupId);
  }
  if (TERMINAL_TOPUP_STATUSES.includes(topup.status as (typeof TERMINAL_TOPUP_STATUSES)[number])) {
    return mapTopupToSummary(topup);
  }
  const updated = await db.driverWalletTopup.update({
    where: { id: topupId },
    data: { status: 'FAILED', failureReason: reason },
  });
  return mapTopupToSummary(updated);
}

export async function findWalletTopupByProviderOrderId(providerOrderId: string, db: Db = prisma) {
  return db.driverWalletTopup.findFirst({ where: { providerOrderId } });
}
