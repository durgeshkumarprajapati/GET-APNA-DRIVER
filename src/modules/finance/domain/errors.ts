import { AppError } from '@/shared/errors/app-error';
import type { PaymentStatus, SettlementStatus } from './types';

export class PaymentNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Payment not found: ${identifier}`, 404, 'PAYMENT_NOT_FOUND');
  }
}

export class InvalidPaymentStatusTransitionError extends AppError {
  constructor(from: PaymentStatus, to: PaymentStatus) {
    super(
      `Invalid payment status transition from ${from} to ${to}`,
      409,
      'PAYMENT_INVALID_STATUS_TRANSITION',
    );
  }
}

export class DuplicatePaymentIdempotencyError extends AppError {
  constructor(idempotencyKey: string) {
    super(
      `A payment was already created with idempotency key: ${idempotencyKey}`,
      409,
      'PAYMENT_DUPLICATE_IDEMPOTENCY',
    );
  }
}

export class PaymentAlreadyInProgressError extends AppError {
  constructor(bookingId: string) {
    super(
      `Booking ${bookingId} already has a payment in progress`,
      409,
      'PAYMENT_ALREADY_IN_PROGRESS',
    );
  }
}

export class BookingNotEligibleForPaymentError extends AppError {
  constructor(bookingId: string, status: string) {
    super(
      `Booking ${bookingId} is not eligible for payment (status: ${status})`,
      409,
      'BOOKING_NOT_ELIGIBLE_FOR_PAYMENT',
    );
  }
}

export class PaymentBookingNotFoundError extends AppError {
  constructor(bookingId: string) {
    super(`Booking not found: ${bookingId}`, 404, 'PAYMENT_BOOKING_NOT_FOUND');
  }
}

export class PaymentProviderError extends AppError {
  constructor(reason: string) {
    super(`Payment provider request failed: ${reason}`, 502, 'PAYMENT_PROVIDER_ERROR');
  }
}

export class PaymentVerificationFailedError extends AppError {
  constructor(reason: string) {
    super(`Payment verification failed: ${reason}`, 422, 'PAYMENT_VERIFICATION_FAILED');
  }
}

export class WebhookSignatureInvalidError extends AppError {
  constructor() {
    super('Webhook signature verification failed', 400, 'WEBHOOK_SIGNATURE_INVALID');
  }
}

export class UnbalancedLedgerTransactionError extends AppError {
  constructor(totalDebits: string, totalCredits: string) {
    super(
      `Refusing to post unbalanced financial transaction: debits ${totalDebits} != credits ${totalCredits}`,
      500,
      'LEDGER_UNBALANCED_TRANSACTION',
    );
  }
}

export class LedgerAccountNotFoundError extends AppError {
  constructor(code: string) {
    super(`Ledger account not found: ${code}`, 500, 'LEDGER_ACCOUNT_NOT_FOUND');
  }
}

export class RefundNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Refund not found: ${identifier}`, 404, 'REFUND_NOT_FOUND');
  }
}

export class InsufficientRefundableAmountError extends AppError {
  constructor(requested: string, maxRefundable: string) {
    super(
      `Refund amount ${requested} exceeds the maximum refundable amount ${maxRefundable}`,
      422,
      'REFUND_EXCEEDS_MAX_REFUNDABLE',
    );
  }
}

export class DuplicateRefundIdempotencyError extends AppError {
  constructor(idempotencyKey: string) {
    super(
      `A refund was already created with idempotency key: ${idempotencyKey}`,
      409,
      'REFUND_DUPLICATE_IDEMPOTENCY',
    );
  }
}

export class RefundNotAllowedError extends AppError {
  constructor(reason: string) {
    super(`Refund is not allowed: ${reason}`, 409, 'REFUND_NOT_ALLOWED');
  }
}

export class DriverWalletNotFoundError extends AppError {
  constructor(driverProfileId: string) {
    super(
      `Driver wallet not found for driver profile: ${driverProfileId}`,
      404,
      'DRIVER_WALLET_NOT_FOUND',
    );
  }
}

export class SettlementNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Settlement not found: ${identifier}`, 404, 'SETTLEMENT_NOT_FOUND');
  }
}

export class InvalidSettlementStatusTransitionError extends AppError {
  constructor(from: SettlementStatus, to: SettlementStatus) {
    super(
      `Invalid settlement status transition from ${from} to ${to}`,
      409,
      'SETTLEMENT_INVALID_STATUS_TRANSITION',
    );
  }
}

export class InsufficientAvailableBalanceError extends AppError {
  constructor(requested: string, available: string) {
    super(
      `Requested settlement amount ${requested} exceeds available balance ${available}`,
      422,
      'SETTLEMENT_INSUFFICIENT_BALANCE',
    );
  }
}

export class SettlementBelowMinimumAmountError extends AppError {
  constructor(requested: string, minimum: string) {
    super(
      `Requested settlement amount ${requested} is below the minimum settlement amount ${minimum}`,
      422,
      'SETTLEMENT_BELOW_MINIMUM',
    );
  }
}

export class SettlementsDisabledError extends AppError {
  constructor() {
    super('Settlements are currently disabled', 409, 'SETTLEMENTS_DISABLED');
  }
}

export class DuplicateActiveSettlementError extends AppError {
  constructor(driverProfileId: string) {
    super(
      `Driver ${driverProfileId} already has an active (PENDING or PROCESSING) settlement`,
      409,
      'SETTLEMENT_DUPLICATE_ACTIVE',
    );
  }
}

export class SettlementNotRetryableError extends AppError {
  constructor(settlementId: string, currentStatus: SettlementStatus) {
    super(
      `Settlement ${settlementId} cannot be retried from status ${currentStatus}; only a FAILED settlement can be retried`,
      409,
      'SETTLEMENT_NOT_RETRYABLE',
    );
  }
}
