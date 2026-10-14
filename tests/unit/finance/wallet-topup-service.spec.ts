const mockTx = {
  driverWalletTopup: { findUnique: jest.fn(), update: jest.fn() },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(mockTx)),
    driverWallet: { findUnique: jest.fn() },
    driverWalletTopup: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getString: jest.fn().mockResolvedValue('INR'),
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
  triggerImmediateOutboxDispatch: jest.fn(),
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn().mockResolvedValue({ id: 'driver-profile-1' }),
}));

jest.mock('@/modules/finance/infrastructure/payment-provider', () => ({
  paymentProvider: {
    createOrder: jest.fn(),
    fetchPayment: jest.fn(),
    verifyPaymentSignature: jest.fn(),
  },
}));

jest.mock('@/modules/finance/application/services/ledger-service', () => ({
  postFinancialTransaction: jest.fn().mockResolvedValue({ id: 'financial-txn-topup-1' }),
}));

jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn(),
}));

import { Prisma } from '@prisma/client';
import {
  captureWalletTopup,
  createWalletDebtTopupOrder,
} from '@/modules/finance/application/services/wallet-topup-service';
import { prisma } from '@/shared/database/prisma';
import { paymentProvider } from '@/modules/finance/infrastructure/payment-provider';
import { postFinancialTransaction } from '@/modules/finance/application/services/ledger-service';
import { applyWalletChange } from '@/modules/finance/application/services/wallet-service';
import {
  NoWalletDebtOwedError,
  PaymentVerificationFailedError,
  WalletTopupExceedsDebtError,
  WalletTopupNotFoundError,
} from '@/modules/finance/domain/errors';

const mockedPrisma = prisma as unknown as {
  driverWallet: { findUnique: jest.Mock };
  driverWalletTopup: { create: jest.Mock; update: jest.Mock; findUnique: jest.Mock };
};

describe('createWalletDebtTopupOrder', () => {
  afterEach(() => jest.clearAllMocks());

  it('refuses to create an order when the wallet balance is not negative', async () => {
    mockedPrisma.driverWallet.findUnique.mockResolvedValue({
      availableBalance: new Prisma.Decimal('0.0000'),
    });

    await expect(createWalletDebtTopupOrder('driver-user-1', {})).rejects.toThrow(
      NoWalletDebtOwedError,
    );
  });

  it('refuses to create an order when no wallet row exists yet (balance is implicitly zero)', async () => {
    mockedPrisma.driverWallet.findUnique.mockResolvedValue(null);

    await expect(createWalletDebtTopupOrder('driver-user-1', {})).rejects.toThrow(
      NoWalletDebtOwedError,
    );
  });

  it('rejects a requested amount that exceeds the outstanding debt', async () => {
    mockedPrisma.driverWallet.findUnique.mockResolvedValue({
      availableBalance: new Prisma.Decimal('-100.0000'),
    });

    await expect(
      createWalletDebtTopupOrder('driver-user-1', { amount: '150.0000' }),
    ).rejects.toThrow(WalletTopupExceedsDebtError);
  });

  it('defaults to paying down the full debt when no amount is given, and creates a matching Razorpay order', async () => {
    mockedPrisma.driverWallet.findUnique.mockResolvedValue({
      availableBalance: new Prisma.Decimal('-250.0000'),
    });
    mockedPrisma.driverWalletTopup.create.mockResolvedValue({
      id: 'topup-1',
      driverProfileId: 'driver-profile-1',
      amount: new Prisma.Decimal('250.0000'),
      currency: 'INR',
      status: 'CREATED',
    });
    mockedPrisma.driverWalletTopup.update.mockResolvedValue({
      id: 'topup-1',
      driverProfileId: 'driver-profile-1',
      amount: new Prisma.Decimal('250.0000'),
      currency: 'INR',
      status: 'PROCESSING',
      providerOrderId: 'order_abc123',
    });
    (paymentProvider.createOrder as jest.Mock).mockResolvedValue({
      providerOrderId: 'order_abc123',
    });

    const checkout = await createWalletDebtTopupOrder('driver-user-1', {});

    expect(paymentProvider.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinorUnits: 25000, currency: 'INR' }),
    );
    expect(checkout.amount).toBe('250.0000');
    expect(checkout.providerOrderId).toBe('order_abc123');
  });

  it('allows a partial payment amount less than the full debt', async () => {
    mockedPrisma.driverWallet.findUnique.mockResolvedValue({
      availableBalance: new Prisma.Decimal('-250.0000'),
    });
    mockedPrisma.driverWalletTopup.create.mockResolvedValue({
      id: 'topup-2',
      driverProfileId: 'driver-profile-1',
      amount: new Prisma.Decimal('100.0000'),
      currency: 'INR',
      status: 'CREATED',
    });
    mockedPrisma.driverWalletTopup.update.mockResolvedValue({
      id: 'topup-2',
      amount: new Prisma.Decimal('100.0000'),
      currency: 'INR',
      status: 'PROCESSING',
      providerOrderId: 'order_partial',
    });
    (paymentProvider.createOrder as jest.Mock).mockResolvedValue({
      providerOrderId: 'order_partial',
    });

    const checkout = await createWalletDebtTopupOrder('driver-user-1', { amount: '100.0000' });

    expect(checkout.amount).toBe('100.0000');
  });
});

describe('captureWalletTopup', () => {
  afterEach(() => jest.clearAllMocks());

  it('is idempotent: an already-CAPTURED top-up is returned unchanged, not re-posted', async () => {
    mockTx.driverWalletTopup.findUnique.mockResolvedValue({
      id: 'topup-1',
      status: 'CAPTURED',
      driverProfileId: 'driver-profile-1',
      amount: new Prisma.Decimal('250.0000'),
      currency: 'INR',
      providerOrderId: 'order_abc123',
      providerPaymentId: 'pay_abc123',
      capturedAt: new Date(),
      createdAt: new Date(),
    });

    const result = await captureWalletTopup({
      topupId: 'topup-1',
      providerPaymentId: 'pay_abc123',
      amountMinorUnits: 25000,
      source: 'webhook',
    });

    expect(result.status).toBe('CAPTURED');
    expect(postFinancialTransaction).not.toHaveBeenCalled();
    expect(mockTx.driverWalletTopup.update).not.toHaveBeenCalled();
  });

  it('throws when the top-up does not exist', async () => {
    mockTx.driverWalletTopup.findUnique.mockResolvedValue(null);

    await expect(
      captureWalletTopup({
        topupId: 'missing',
        providerPaymentId: 'pay_1',
        amountMinorUnits: 100,
        source: 'webhook',
      }),
    ).rejects.toThrow(WalletTopupNotFoundError);
  });

  it('rejects capture when the provider-confirmed amount does not match the expected amount', async () => {
    mockTx.driverWalletTopup.findUnique.mockResolvedValue({
      id: 'topup-1',
      status: 'PROCESSING',
      driverProfileId: 'driver-profile-1',
      amount: new Prisma.Decimal('250.0000'),
      currency: 'INR',
    });

    await expect(
      captureWalletTopup({
        topupId: 'topup-1',
        providerPaymentId: 'pay_1',
        amountMinorUnits: 9999,
        source: 'client_verify',
      }),
    ).rejects.toThrow(PaymentVerificationFailedError);
  });

  it('credits DRIVER_PAYABLE for the full amount and applies a positive DEBT_REPAYMENT wallet delta', async () => {
    mockTx.driverWalletTopup.findUnique.mockResolvedValue({
      id: 'topup-1',
      status: 'PROCESSING',
      driverProfileId: 'driver-profile-1',
      amount: new Prisma.Decimal('250.0000'),
      currency: 'INR',
    });
    mockTx.driverWalletTopup.update.mockResolvedValue({
      id: 'topup-1',
      status: 'CAPTURED',
      driverProfileId: 'driver-profile-1',
      amount: new Prisma.Decimal('250.0000'),
      currency: 'INR',
      providerOrderId: 'order_abc123',
      providerPaymentId: 'pay_abc123',
      capturedAt: new Date(),
      createdAt: new Date(),
    });

    await captureWalletTopup({
      topupId: 'topup-1',
      providerPaymentId: 'pay_abc123',
      amountMinorUnits: 25000,
      source: 'client_verify',
    });

    expect(postFinancialTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'DRIVER_DEBT_REPAID',
        postings: [
          {
            accountCode: 'PAYMENT_PROVIDER_CLEARING',
            debitAmount: '250.0000',
            creditAmount: '0',
          },
          { accountCode: 'DRIVER_PAYABLE', debitAmount: '0', creditAmount: '250.0000' },
        ],
      }),
      expect.anything(),
    );
    expect(applyWalletChange).toHaveBeenCalledWith(
      expect.objectContaining({
        driverProfileId: 'driver-profile-1',
        changeType: 'DEBT_REPAYMENT',
        availableDelta: '250.0000',
      }),
      expect.anything(),
    );
  });
});
