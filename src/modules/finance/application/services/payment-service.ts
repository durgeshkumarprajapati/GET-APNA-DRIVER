import 'server-only';
import type { Payment } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getString } from '@/shared/config/configuration-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { env } from '@/shared/config/env';
import { paymentProvider } from '../../infrastructure/payment-provider';
import { calculateBookingAmount, calculateCommission } from './pricing-service';
import { postFinancialTransaction } from './ledger-service';
import { applyWalletChange } from './wallet-service';
import { validatePaymentStatusTransition } from '../../domain/payment-state-machine';
import { LEDGER_ACCOUNT_CODES } from '../../domain/ledger-accounts';
import type { LedgerPosting } from '../../domain/types';
import {
  ZERO,
  fromMinorUnits,
  isPositive,
  roundMoney,
  toDecimal,
  toMinorUnits,
} from '../../domain/money';
import {
  BookingNotEligibleForPaymentError,
  DuplicatePaymentIdempotencyError,
  PaymentAlreadyInProgressError,
  PaymentBookingNotFoundError,
  PaymentNotFoundError,
  PaymentProviderError,
  PaymentVerificationFailedError,
} from '../../domain/errors';

export { PaymentNotFoundError };

export interface CreatePaymentForBookingInput {
  bookingId: string;
  idempotencyKey?: string | null;
}

export interface PaymentCheckoutInit {
  paymentId: string;
  providerOrderId: string;
  amount: string;
  currency: string;
  /** Razorpay's public key — safe to expose to the client checkout widget. */
  razorpayKeyId: string | null;
}

export interface PaymentSummary {
  id: string;
  bookingId: string;
  customerId: string;
  status: Payment['status'];
  amount: string;
  currency: string;
  provider: string;
  commissionAmount: string | null;
  driverEarningsAmount: string | null;
  promotionId: string | null;
  promotionCodeSnapshot: string | null;
  discountAmount: string | null;
  capturedAt: string | null;
  createdAt: string;
}

/** Customer-facing sanitized DTO excluding internal financial fields. */
export interface CustomerPaymentSummary {
  id: string;
  bookingId: string;
  customerId: string;
  status: Payment['status'];
  amount: string;
  currency: string;
  provider: string;
  promotionId: string | null;
  promotionCodeSnapshot: string | null;
  discountAmount: string | null;
  capturedAt: string | null;
  createdAt: string;
}

function mapPaymentToSummary(payment: Payment): PaymentSummary {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    customerId: payment.customerId,
    status: payment.status,
    amount: payment.amount.toFixed(4),
    currency: payment.currency,
    provider: payment.provider,
    commissionAmount: payment.commissionAmount ? payment.commissionAmount.toFixed(4) : null,
    driverEarningsAmount: payment.driverEarningsAmount
      ? payment.driverEarningsAmount.toFixed(4)
      : null,
    promotionId: payment.promotionId,
    promotionCodeSnapshot: payment.promotionCodeSnapshot,
    discountAmount: payment.discountAmount ? payment.discountAmount.toFixed(4) : null,
    capturedAt: payment.capturedAt ? payment.capturedAt.toISOString() : null,
    createdAt: payment.createdAt.toISOString(),
  };
}

function mapPaymentToCustomerSummary(payment: Payment): CustomerPaymentSummary {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    customerId: payment.customerId,
    status: payment.status,
    amount: payment.amount.toFixed(4),
    currency: payment.currency,
    provider: payment.provider,
    promotionId: payment.promotionId,
    promotionCodeSnapshot: payment.promotionCodeSnapshot,
    discountAmount: payment.discountAmount ? payment.discountAmount.toFixed(4) : null,
    capturedAt: payment.capturedAt ? payment.capturedAt.toISOString() : null,
    createdAt: payment.createdAt.toISOString(),
  };
}

function toCheckoutInit(payment: Payment): PaymentCheckoutInit {
  if (!payment.providerOrderId) {
    throw new PaymentProviderError('Payment has no provider order reference yet');
  }
  return {
    paymentId: payment.id,
    providerOrderId: payment.providerOrderId,
    amount: payment.amount.toFixed(4),
    currency: payment.currency,
    razorpayKeyId: env.RAZORPAY_KEY_ID ?? null,
  };
}

/**
 * Step 1-4 of the payment flow: calculate the booking's amount, create the
 * Payment record, create the matching Razorpay order, and return only the
 * safe checkout-initialization data (order id, amount, currency, public
 * key — never a secret) to the client.
 *
 * Payment is only created once a booking has actually completed
 * (TRIP_COMPLETED) — booking completion and payment success are independent
 * state machines, but this phase's marketplace flow charges post-trip, not
 * pre-trip, so payment creation is deliberately gated on that booking state.
 *
 * The external Razorpay call happens outside any DB transaction (a slow
 * network call must never hold a DB transaction open) — the Payment row is
 * created first as CREATED, and updated to PROCESSING once the provider
 * order exists.
 */
export async function createPaymentForBooking(
  customerUserId: string,
  input: CreatePaymentForBookingInput,
  db: Db = prisma,
): Promise<PaymentCheckoutInit> {
  if (input.idempotencyKey) {
    const existing = await db.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (existing.customerId !== customerUserId) {
        throw new DuplicatePaymentIdempotencyError(input.idempotencyKey);
      }
      return toCheckoutInit(existing);
    }
  }

  const booking = await db.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking || booking.customerId !== customerUserId) {
    throw new PaymentBookingNotFoundError(input.bookingId);
  }
  if (booking.status !== 'TRIP_COMPLETED') {
    throw new BookingNotEligibleForPaymentError(input.bookingId, booking.status);
  }

  const activePayment = await db.payment.findFirst({
    where: { bookingId: input.bookingId, status: { notIn: ['FAILED', 'CANCELLED'] } },
  });
  if (activePayment) {
    throw new PaymentAlreadyInProgressError(input.bookingId);
  }

  const { amount: grossAmount } = await calculateBookingAmount(booking, db);
  const currency = await getString('finance.currency', 'INR', db);

  // The booking may carry a frozen promotion discount (applied and locked
  // in at booking-creation time — see promotion-eligibility-service.ts).
  // The customer is only ever charged the gross fare net of that discount;
  // never recalculated here, only copied forward from the booking snapshot.
  const discountAmount = booking.discountAmount
    ? roundMoney(toDecimal(booking.discountAmount)).toFixed(4)
    : null;
  const chargeAmount = discountAmount
    ? roundMoney(toDecimal(grossAmount).sub(toDecimal(discountAmount))).toFixed(4)
    : grossAmount;

  const payment = await db.payment.create({
    data: {
      bookingId: booking.id,
      customerId: customerUserId,
      driverProfileId: booking.driverProfileId,
      amount: chargeAmount,
      currency,
      status: 'CREATED',
      idempotencyKey: input.idempotencyKey ?? null,
      promotionId: booking.promotionId,
      promotionCodeSnapshot: booking.promotionCodeSnapshot,
      discountAmount,
    },
  });

  await recordAuditLog(db, {
    actorUserId: customerUserId,
    action: 'finance.payment.created',
    entityType: 'Payment',
    entityId: payment.id,
    beforeState: null,
    afterState: { status: payment.status, amount: chargeAmount },
    requestMetadata: null,
  });

  let providerOrderId: string;
  try {
    const order = await paymentProvider.createOrder({
      amountMinorUnits: toMinorUnits(toDecimal(chargeAmount)),
      currency,
      receipt: payment.id,
      notes: { bookingId: booking.id, paymentId: payment.id },
    });
    providerOrderId = order.providerOrderId;
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Unknown provider error';
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: reason },
    });
    await db.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        provider: payment.provider,
        status: 'FAILED',
        failureReason: reason,
      },
    });
    throw new PaymentProviderError(reason);
  }

  const updated = await db.$transaction(async (tx: Db) => {
    const result = await tx.payment.update({
      where: { id: payment.id },
      data: { providerOrderId, status: 'PROCESSING' },
    });

    await tx.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        provider: payment.provider,
        providerOrderId,
        status: 'INITIATED',
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'payment.created',
      aggregateType: 'Payment',
      aggregateId: payment.id,
      payload: {
        paymentId: payment.id,
        bookingId: booking.id,
        amount: chargeAmount,
        providerOrderId,
      },
    });

    return result;
  });

  return toCheckoutInit(updated);
}

export interface VerifyPaymentInput {
  paymentId: string;
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

/**
 * Server-side verification of the client's checkout-completion callback
 * (step 5). Never trusts the client alone: checks the HMAC signature *and*
 * independently fetches the payment from Razorpay to confirm it actually
 * reports "captured" before finalizing. Delegates the actual capture
 * (ledger + wallet + audit + outbox) to capturePayment, the single function
 * that also the webhook path calls — so both trusted paths converge on
 * identical, idempotent capture logic.
 */
export async function verifyAndCapturePayment(
  customerUserId: string,
  input: VerifyPaymentInput,
  db: Db = prisma,
): Promise<PaymentSummary> {
  const payment = await db.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment || payment.customerId !== customerUserId) {
    throw new PaymentNotFoundError(input.paymentId);
  }

  if (
    payment.status === 'CAPTURED' ||
    payment.status === 'PARTIALLY_REFUNDED' ||
    payment.status === 'REFUNDED'
  ) {
    return mapPaymentToSummary(payment);
  }

  if (payment.providerOrderId !== input.providerOrderId) {
    throw new PaymentVerificationFailedError('Order reference does not match this payment');
  }

  const signatureValid = paymentProvider.verifyPaymentSignature({
    providerOrderId: input.providerOrderId,
    providerPaymentId: input.providerPaymentId,
    signature: input.signature,
  });
  if (!signatureValid) {
    throw new PaymentVerificationFailedError('Invalid payment signature');
  }

  const providerPayment = await paymentProvider.fetchPayment(input.providerPaymentId);
  if (providerPayment.status !== 'captured') {
    throw new PaymentVerificationFailedError(
      `Provider reports payment status: ${providerPayment.status}`,
    );
  }

  return capturePayment(
    {
      paymentId: payment.id,
      providerPaymentId: input.providerPaymentId,
      amountMinorUnits: providerPayment.amountMinorUnits,
      source: 'client_verify',
    },
    db,
  );
}

export interface CapturePaymentInput {
  paymentId: string;
  providerPaymentId: string;
  amountMinorUnits: number;
  source: 'client_verify' | 'webhook';
}

/**
 * The single place that finalizes a captured payment: posts the balanced
 * FinancialTransaction (customer paid -> platform commission + driver
 * payable), credits the driver's wallet, writes the audit trail, and
 * inserts the outbox events. Idempotent — calling it twice for an
 * already-CAPTURED payment (webhook and client-verify racing, or Razorpay
 * retrying a webhook delivery) is a safe no-op.
 */
export async function capturePayment(
  input: CapturePaymentInput,
  db: Db = prisma,
): Promise<PaymentSummary> {
  return db.$transaction(async (tx: Db) => {
    const payment = await tx.payment.findUnique({ where: { id: input.paymentId } });
    if (!payment) {
      throw new PaymentNotFoundError(input.paymentId);
    }

    if (
      payment.status === 'CAPTURED' ||
      payment.status === 'PARTIALLY_REFUNDED' ||
      payment.status === 'REFUNDED'
    ) {
      return mapPaymentToSummary(payment);
    }

    if (payment.status === 'CREATED') {
      // A webhook can arrive before our own order-creation flow (which sets
      // CREATED -> PROCESSING) has committed. CREATED -> CAPTURED is not a
      // direct transition in the state machine, so validate both hops
      // explicitly rather than persisting an intermediate PROCESSING write.
      validatePaymentStatusTransition('CREATED', 'PROCESSING');
      validatePaymentStatusTransition('PROCESSING', 'CAPTURED');
    } else {
      validatePaymentStatusTransition(payment.status, 'CAPTURED');
    }

    const amountFromProvider = fromMinorUnits(input.amountMinorUnits);
    if (!roundMoney(amountFromProvider).equals(roundMoney(toDecimal(payment.amount)))) {
      throw new PaymentVerificationFailedError(
        `Captured amount ${amountFromProvider.toFixed(4)} does not match expected amount ${payment.amount.toFixed(4)}`,
      );
    }

    // Commission and driver earnings are always computed on the GROSS fare
    // (charged amount + any promotion discount), never on the discounted
    // amount actually charged — a platform-funded promotion must not reduce
    // what the driver is owed. See the PROMOTION_DISCOUNT_EXPENSE posting
    // below, which books the resulting gap.
    const discountAmount = payment.discountAmount ? toDecimal(payment.discountAmount) : ZERO;
    const grossAmount = roundMoney(toDecimal(payment.amount).add(discountAmount)).toFixed(4);
    const { commissionPercentage, commissionAmount, driverEarningsAmount } =
      await calculateCommission(grossAmount, tx);

    const capturedAt = new Date();
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CAPTURED',
        providerPaymentId: input.providerPaymentId,
        commissionPercentageSnapshot: commissionPercentage,
        commissionAmount,
        driverEarningsAmount,
        capturedAt,
      },
    });

    await tx.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        provider: payment.provider,
        providerOrderId: payment.providerOrderId,
        providerPaymentId: input.providerPaymentId,
        status: 'SUCCEEDED',
        responseSnapshot: { source: input.source },
      },
    });

    const postings: LedgerPosting[] = [
      {
        accountCode: LEDGER_ACCOUNT_CODES.PAYMENT_PROVIDER_CLEARING,
        debitAmount: payment.amount.toFixed(4),
        creditAmount: '0',
      },
      {
        accountCode: LEDGER_ACCOUNT_CODES.PLATFORM_REVENUE_COMMISSION,
        debitAmount: '0',
        creditAmount: commissionAmount,
      },
      {
        accountCode: LEDGER_ACCOUNT_CODES.DRIVER_PAYABLE,
        debitAmount: '0',
        creditAmount: driverEarningsAmount,
      },
    ];
    // Closes the gap between the gross fare (what commission/driver payable
    // are computed on) and the discounted amount actually collected from
    // the customer above — without this leg the transaction would not
    // balance whenever a promotion discount applies.
    if (isPositive(discountAmount)) {
      postings.push({
        accountCode: LEDGER_ACCOUNT_CODES.PROMOTION_DISCOUNT_EXPENSE,
        debitAmount: discountAmount.toFixed(4),
        creditAmount: '0',
      });
    }

    const financialTransaction = await postFinancialTransaction(
      {
        transactionType: 'PAYMENT_CAPTURED',
        referenceEntityType: 'Payment',
        referenceEntityId: payment.id,
        idempotencyKey: `payment_captured:${payment.id}`,
        description: `Payment captured for booking ${payment.bookingId}`,
        postings,
      },
      tx,
    );

    if (payment.driverProfileId) {
      await applyWalletChange(
        {
          driverProfileId: payment.driverProfileId,
          financialTransactionId: financialTransaction.id,
          changeType: 'EARNING_RECOGNIZED',
          availableDelta: driverEarningsAmount,
          totalEarnedDelta: driverEarningsAmount,
        },
        tx,
      );
    }

    await recordAuditLog(tx, {
      actorUserId: null,
      action: 'finance.payment.captured',
      entityType: 'Payment',
      entityId: payment.id,
      beforeState: { status: payment.status },
      afterState: { status: 'CAPTURED', commissionAmount, driverEarningsAmount },
      requestMetadata: { source: input.source },
    });

    await insertOutboxEvent(tx, {
      eventType: 'payment.captured',
      aggregateType: 'Payment',
      aggregateId: payment.id,
      payload: {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        amount: payment.amount.toFixed(4),
        commissionAmount,
        driverEarningsAmount,
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'finance.transaction.posted',
      aggregateType: 'FinancialTransaction',
      aggregateId: financialTransaction.id,
      payload: { transactionType: 'PAYMENT_CAPTURED', referenceEntityId: payment.id },
    });

    if (payment.driverProfileId) {
      await insertOutboxEvent(tx, {
        eventType: 'driver.earnings.recognized',
        aggregateType: 'DriverWallet',
        aggregateId: payment.driverProfileId,
        payload: {
          driverProfileId: payment.driverProfileId,
          paymentId: payment.id,
          amount: driverEarningsAmount,
        },
      });

      await insertOutboxEvent(tx, {
        eventType: 'driver.wallet.updated',
        aggregateType: 'DriverWallet',
        aggregateId: payment.driverProfileId,
        payload: { driverProfileId: payment.driverProfileId, changeType: 'EARNING_RECOGNIZED' },
      });
    }

    return mapPaymentToSummary(updated);
  });
}

export async function markPaymentFailed(
  paymentId: string,
  reason: string,
  db: Db = prisma,
): Promise<PaymentSummary> {
  return db.$transaction(async (tx: Db) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new PaymentNotFoundError(paymentId);
    }
    if (payment.status === 'FAILED' || payment.status === 'CAPTURED') {
      return mapPaymentToSummary(payment); // Idempotent: already terminal/settled.
    }

    validatePaymentStatusTransition(payment.status, 'FAILED');

    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'FAILED', failureReason: reason },
    });

    await recordAuditLog(tx, {
      actorUserId: null,
      action: 'finance.payment.failed',
      entityType: 'Payment',
      entityId: paymentId,
      beforeState: { status: payment.status },
      afterState: { status: 'FAILED', reason },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'payment.failed',
      aggregateType: 'Payment',
      aggregateId: paymentId,
      payload: { paymentId, reason },
    });

    return mapPaymentToSummary(updated);
  });
}

export async function getPaymentById(
  userId: string,
  paymentId: string,
  db: Db = prisma,
): Promise<CustomerPaymentSummary> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.customerId !== userId) {
    throw new PaymentNotFoundError(paymentId);
  }
  return mapPaymentToCustomerSummary(payment);
}

export async function listCustomerPayments(
  customerUserId: string,
  db: Db = prisma,
): Promise<CustomerPaymentSummary[]> {
  const payments = await db.payment.findMany({
    where: { customerId: customerUserId },
    orderBy: { createdAt: 'desc' },
    // Previously unbounded.
    take: 200,
  });
  return payments.map(mapPaymentToCustomerSummary);
}

/** Admin visibility: no ownership restriction, gated by the finance.read/payments.read permission at the route layer. */
export async function getPaymentByIdForAdmin(
  paymentId: string,
  db: Db = prisma,
): Promise<PaymentSummary> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new PaymentNotFoundError(paymentId);
  }
  return mapPaymentToSummary(payment);
}

export async function listAllPayments(db: Db = prisma): Promise<PaymentSummary[]> {
  const payments = await db.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return payments.map(mapPaymentToSummary);
}

export { mapPaymentToSummary };
