jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(mockTx)),
    refund: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    payment: { findUnique: jest.fn() },
  },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getBoolean: jest.fn().mockResolvedValue(true),
  getInteger: jest.fn().mockResolvedValue(30),
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({ insertOutboxEvent: jest.fn() }));

jest.mock('@/modules/finance/infrastructure/payment-provider', () => ({
  paymentProvider: { initiateRefund: jest.fn() },
}));

jest.mock('@/modules/finance/application/services/ledger-service', () => ({
  postFinancialTransaction: jest.fn().mockResolvedValue({ id: 'financial-txn-refund-1' }),
}));

jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn(),
}));

const mockTx = {
  refund: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  payment: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
};

import { Prisma } from '@prisma/client';
import {
  completeRefund,
  initiateRefund,
} from '@/modules/finance/application/services/refund-service';
import { prisma } from '@/shared/database/prisma';
import { paymentProvider } from '@/modules/finance/infrastructure/payment-provider';
import { applyWalletChange } from '@/modules/finance/application/services/wallet-service';
import {
  DuplicateRefundIdempotencyError,
  InsufficientRefundableAmountError,
  RefundNotAllowedError,
} from '@/modules/finance/domain/errors';

const mockedPrisma = prisma as unknown as {
  refund: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
  payment: { findUnique: jest.Mock };
};

function capturedPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-1',
    status: 'CAPTURED',
    amount: new Prisma.Decimal('100.0000'),
    currency: 'INR',
    providerPaymentId: 'pay_1',
    driverProfileId: 'driver-1',
    commissionPercentageSnapshot: new Prisma.Decimal('20.0000'),
    capturedAt: new Date(),
    ...overrides,
  };
}

describe('initiateRefund', () => {
  afterEach(() => jest.clearAllMocks());

  it('is idempotent for the same actor and idempotency key', async () => {
    mockedPrisma.refund.findUnique.mockResolvedValue({
      id: 'refund-1',
      paymentId: 'payment-1',
      amount: new Prisma.Decimal('50.0000'),
      currency: 'INR',
      status: 'PROCESSED',
      reason: null,
      processedAt: new Date(),
      createdAt: new Date(),
      initiatedBy: 'admin-1',
    });

    const result = await initiateRefund('admin-1', {
      paymentId: 'payment-1',
      idempotencyKey: 'idem-1',
    });

    expect(result.id).toBe('refund-1');
    expect(mockedPrisma.payment.findUnique).not.toHaveBeenCalled();
  });

  it('rejects reusing an idempotency key that belongs to a different admin', async () => {
    mockedPrisma.refund.findUnique.mockResolvedValue({
      id: 'refund-1',
      initiatedBy: 'admin-1',
    });

    await expect(
      initiateRefund('admin-2', { paymentId: 'payment-1', idempotencyKey: 'idem-1' }),
    ).rejects.toThrow(DuplicateRefundIdempotencyError);
  });

  it('rejects a refund amount greater than the remaining refundable amount', async () => {
    mockedPrisma.refund.findUnique.mockResolvedValue(null);
    mockedPrisma.payment.findUnique.mockResolvedValue(capturedPayment());
    mockedPrisma.refund.findMany.mockResolvedValue([
      { amount: new Prisma.Decimal('40.0000'), status: 'PROCESSED' },
    ]);

    // Already refunded 40 of 100 -> max refundable is 60.
    await expect(
      initiateRefund('admin-1', { paymentId: 'payment-1', amount: '70.0000' }),
    ).rejects.toThrow(InsufficientRefundableAmountError);
  });

  it('allows a partial refund within the remaining refundable amount', async () => {
    mockedPrisma.refund.findUnique.mockResolvedValue(null);
    mockedPrisma.payment.findUnique.mockResolvedValue(capturedPayment());
    mockedPrisma.refund.findMany.mockResolvedValue([]);
    mockedPrisma.refund.create.mockResolvedValue({
      id: 'refund-2',
      paymentId: 'payment-1',
      amount: new Prisma.Decimal('30.0000'),
      currency: 'INR',
      status: 'PENDING',
      reason: null,
      processedAt: null,
      createdAt: new Date(),
    });
    (paymentProvider.initiateRefund as jest.Mock).mockResolvedValue({
      providerRefundId: 'rfnd_1',
      status: 'pending', // not yet processed -> stays PROCESSING
      amountMinorUnits: 3000,
    });
    mockedPrisma.refund.update.mockResolvedValue({
      id: 'refund-2',
      paymentId: 'payment-1',
      amount: new Prisma.Decimal('30.0000'),
      currency: 'INR',
      status: 'PROCESSING',
      reason: null,
      processedAt: null,
      createdAt: new Date(),
    });

    const result = await initiateRefund('admin-1', { paymentId: 'payment-1', amount: '30.0000' });

    expect(result.status).toBe('PROCESSING');
    expect(result.amount).toBe('30.0000');
  });

  it('rejects refunding a payment that was never captured', async () => {
    mockedPrisma.refund.findUnique.mockResolvedValue(null);
    mockedPrisma.payment.findUnique.mockResolvedValue(capturedPayment({ status: 'CREATED' }));

    await expect(initiateRefund('admin-1', { paymentId: 'payment-1' })).rejects.toThrow(
      RefundNotAllowedError,
    );
  });
});

describe('completeRefund', () => {
  afterEach(() => jest.clearAllMocks());

  it('reverses commission and driver earnings proportionally, using the payment snapshot rate', async () => {
    mockTx.refund.findUnique.mockResolvedValue({
      id: 'refund-1',
      paymentId: 'payment-1',
      amount: new Prisma.Decimal('50.0000'),
      status: 'PROCESSING',
    });
    mockTx.payment.findUniqueOrThrow.mockResolvedValue(capturedPayment());
    mockTx.refund.update.mockResolvedValue({
      id: 'refund-1',
      paymentId: 'payment-1',
      amount: new Prisma.Decimal('50.0000'),
      currency: 'INR',
      status: 'PROCESSED',
      reason: null,
      processedAt: new Date(),
      createdAt: new Date(),
    });
    mockTx.refund.findMany.mockResolvedValue([{ amount: new Prisma.Decimal('50.0000') }]);
    mockTx.payment.update.mockResolvedValue({ status: 'PARTIALLY_REFUNDED' });

    await completeRefund({ refundId: 'refund-1', providerRefundId: 'rfnd_1', source: 'webhook' });

    // 50 refunded at a 20% commission snapshot -> 10 commission reversal, 40 driver clawback.
    expect(applyWalletChange).toHaveBeenCalledWith(
      expect.objectContaining({
        changeType: 'EARNING_REVERSED',
        availableDelta: '-40.0000',
        totalEarnedDelta: '-40.0000',
      }),
      expect.anything(),
    );
  });

  it('is idempotent: an already-PROCESSED refund is returned unchanged', async () => {
    const processed = {
      id: 'refund-1',
      paymentId: 'payment-1',
      amount: new Prisma.Decimal('50.0000'),
      currency: 'INR',
      status: 'PROCESSED',
      reason: null,
      processedAt: new Date(),
      createdAt: new Date(),
    };
    mockTx.refund.findUnique.mockResolvedValue(processed);

    const result = await completeRefund({
      refundId: 'refund-1',
      providerRefundId: 'rfnd_1',
      source: 'webhook',
    });

    expect(result.status).toBe('PROCESSED');
    expect(mockTx.payment.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
