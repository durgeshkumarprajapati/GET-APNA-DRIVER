jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(mockTx)),
    driverWallet: { findUnique: jest.fn() },
  },
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn(),
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getBoolean: jest.fn().mockResolvedValue(true),
  getString: jest.fn().mockResolvedValue('500.0000'),
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({ insertOutboxEvent: jest.fn() }));

jest.mock('@/modules/finance/application/services/ledger-service', () => ({
  postFinancialTransaction: jest.fn().mockResolvedValue({ id: 'financial-txn-settlement-1' }),
}));

jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn(),
}));

const mockTx = {
  driverSettlement: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
};

import { Prisma } from '@prisma/client';
import {
  createSettlement,
  failOrCancelSettlement,
} from '@/modules/finance/application/services/settlement-service';
import { prisma } from '@/shared/database/prisma';
import { getBoolean, getString } from '@/shared/config/configuration-service';
import {
  DriverWalletNotFoundError,
  InsufficientAvailableBalanceError,
  SettlementBelowMinimumAmountError,
  SettlementsDisabledError,
} from '@/modules/finance/domain/errors';

const mockedPrisma = prisma as unknown as { driverWallet: { findUnique: jest.Mock } };
const mockedGetBoolean = getBoolean as jest.Mock;
const mockedGetString = getString as jest.Mock;

function wallet(availableBalance: string) {
  return {
    id: 'wallet-1',
    driverProfileId: 'driver-1',
    availableBalance: new Prisma.Decimal(availableBalance),
  };
}

describe('createSettlement', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects when settlements are disabled', async () => {
    mockedGetBoolean.mockResolvedValue(false);

    await expect(createSettlement('admin-1', { driverProfileId: 'driver-1' })).rejects.toThrow(
      SettlementsDisabledError,
    );
  });

  it('throws when the driver has no wallet yet', async () => {
    mockedGetBoolean.mockResolvedValue(true);
    mockedPrisma.driverWallet.findUnique.mockResolvedValue(null);

    await expect(createSettlement('admin-1', { driverProfileId: 'driver-1' })).rejects.toThrow(
      DriverWalletNotFoundError,
    );
  });

  it('rejects a settlement below the configured minimum amount', async () => {
    mockedGetBoolean.mockResolvedValue(true);
    mockedGetString.mockResolvedValue('500.0000');
    mockedPrisma.driverWallet.findUnique.mockResolvedValue(wallet('1000.0000'));

    await expect(
      createSettlement('admin-1', { driverProfileId: 'driver-1', amount: '100.0000' }),
    ).rejects.toThrow(SettlementBelowMinimumAmountError);
  });

  it('rejects settling more than the driver currently has available (double-settlement guard)', async () => {
    mockedGetBoolean.mockResolvedValue(true);
    mockedGetString.mockResolvedValue('500.0000');
    // Simulates a driver whose available balance has already been reduced
    // by a prior settlement reservation.
    mockedPrisma.driverWallet.findUnique.mockResolvedValue(wallet('600.0000'));

    await expect(
      createSettlement('admin-1', { driverProfileId: 'driver-1', amount: '1000.0000' }),
    ).rejects.toThrow(InsufficientAvailableBalanceError);
  });

  it('reserves the driver full available balance when no amount is specified', async () => {
    mockedGetBoolean.mockResolvedValue(true);
    mockedGetString.mockResolvedValue('500.0000');
    mockedPrisma.driverWallet.findUnique.mockResolvedValue(wallet('2000.0000'));
    mockTx.driverSettlement.create.mockResolvedValue({
      id: 'settlement-1',
      amount: new Prisma.Decimal('2000.0000'),
    });
    mockTx.driverSettlement.update.mockResolvedValue({
      id: 'settlement-1',
      driverProfileId: 'driver-1',
      amount: new Prisma.Decimal('2000.0000'),
      amountPaid: null,
      status: 'PENDING',
      payoutProvider: 'manual',
      payoutReference: null,
      failureReason: null,
      initiatedAt: null,
      completedAt: null,
      createdAt: new Date(),
    });

    const result = await createSettlement('admin-1', { driverProfileId: 'driver-1' });

    expect(result.amount).toBe('2000.0000');
    expect(result.status).toBe('PENDING');
  });
});

describe('failOrCancelSettlement', () => {
  afterEach(() => jest.clearAllMocks());

  it('releases the reservation back to available balance when a settlement fails', async () => {
    mockTx.driverSettlement.findUnique.mockResolvedValue({
      id: 'settlement-1',
      driverProfileId: 'driver-1',
      status: 'PROCESSING',
      amount: new Prisma.Decimal('500.0000'),
      financialTransactionId: 'financial-txn-settlement-1',
    });
    mockTx.driverSettlement.update.mockResolvedValue({
      id: 'settlement-1',
      driverProfileId: 'driver-1',
      amount: new Prisma.Decimal('500.0000'),
      amountPaid: null,
      status: 'FAILED',
      payoutProvider: 'manual',
      payoutReference: null,
      failureReason: 'bank transfer bounced',
      initiatedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
    });

    const { applyWalletChange } = jest.requireMock(
      '@/modules/finance/application/services/wallet-service',
    ) as { applyWalletChange: jest.Mock };

    const result = await failOrCancelSettlement(
      'admin-1',
      'settlement-1',
      'FAILED',
      'bank transfer bounced',
    );

    expect(result.status).toBe('FAILED');
    expect(applyWalletChange).toHaveBeenCalledWith(
      expect.objectContaining({
        changeType: 'SETTLEMENT_RELEASED',
        availableDelta: '500.0000',
        reservedDelta: '-500.0000',
      }),
      expect.anything(),
    );
  });
});
