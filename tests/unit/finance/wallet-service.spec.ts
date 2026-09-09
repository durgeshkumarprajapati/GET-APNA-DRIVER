jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn(),
}));

import {
  applyWalletChange,
  getDriverWalletSummary,
} from '@/modules/finance/application/services/wallet-service';

function buildDb(overrides: Record<string, unknown> = {}) {
  return {
    driverWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    ...overrides,
  };
}

describe('applyWalletChange', () => {
  it('creates the wallet on first use and credits available balance for a recognized earning', async () => {
    const db = buildDb();
    db.driverWallet.findUnique.mockResolvedValue(null);
    db.driverWallet.create.mockResolvedValue({
      id: 'wallet-1',
      driverProfileId: 'driver-1',
      availableBalance: '0.0000',
      pendingBalance: '0.0000',
      reservedBalance: '0.0000',
      totalEarned: '0.0000',
      totalSettled: '0.0000',
    });
    db.walletTransaction.findUnique.mockResolvedValue(null);
    db.driverWallet.update.mockResolvedValue({
      id: 'wallet-1',
      driverProfileId: 'driver-1',
      availableBalance: '120.0000',
      pendingBalance: '0.0000',
      reservedBalance: '0.0000',
      totalEarned: '120.0000',
      totalSettled: '0.0000',
    });

    const result = await applyWalletChange(
      {
        driverProfileId: 'driver-1',
        financialTransactionId: 'txn-1',
        changeType: 'EARNING_RECOGNIZED',
        availableDelta: '120.0000',
        totalEarnedDelta: '120.0000',
      },
      db as never,
    );

    expect(result.availableBalance).toBe('120.0000');
    expect(db.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          availableDelta: expect.anything(),
          changeType: 'EARNING_RECOGNIZED',
        }),
      }),
    );
  });

  it('is a no-op when this financialTransactionId was already applied to this wallet', async () => {
    const db = buildDb();
    const existingWallet = {
      id: 'wallet-1',
      driverProfileId: 'driver-1',
      availableBalance: '120.0000',
      pendingBalance: '0.0000',
      reservedBalance: '0.0000',
      totalEarned: '120.0000',
      totalSettled: '0.0000',
    };
    db.driverWallet.findUnique.mockResolvedValue(existingWallet);
    db.walletTransaction.findUnique.mockResolvedValue({ id: 'already-applied' });

    const result = await applyWalletChange(
      {
        driverProfileId: 'driver-1',
        financialTransactionId: 'txn-1',
        changeType: 'EARNING_RECOGNIZED',
        availableDelta: '120.0000',
      },
      db as never,
    );

    expect(result).toBe(existingWallet);
    expect(db.driverWallet.update).not.toHaveBeenCalled();
    expect(db.walletTransaction.create).not.toHaveBeenCalled();
  });

  it('correctly separates a bucket-transfer change (available -> reserved) instead of netting it to zero', async () => {
    const db = buildDb();
    db.driverWallet.findUnique.mockResolvedValue({
      id: 'wallet-1',
      driverProfileId: 'driver-1',
      availableBalance: '500.0000',
      pendingBalance: '0.0000',
      reservedBalance: '0.0000',
      totalEarned: '500.0000',
      totalSettled: '0.0000',
    });
    db.walletTransaction.findUnique.mockResolvedValue(null);
    db.driverWallet.update.mockResolvedValue({
      id: 'wallet-1',
      driverProfileId: 'driver-1',
      availableBalance: '400.0000',
      pendingBalance: '0.0000',
      reservedBalance: '100.0000',
      totalEarned: '500.0000',
      totalSettled: '0.0000',
    });

    await applyWalletChange(
      {
        driverProfileId: 'driver-1',
        financialTransactionId: 'txn-settlement-1',
        changeType: 'SETTLEMENT_RESERVED',
        availableDelta: '-100.0000',
        reservedDelta: '100.0000',
      },
      db as never,
    );

    const createCall = db.walletTransaction.create.mock.calls[0][0];
    expect(createCall.data.availableDelta.toString()).toBe('-100');
    expect(createCall.data.reservedDelta.toString()).toBe('100');
  });
});

describe('getDriverWalletSummary', () => {
  it('returns a zero-balance summary without writing a row for a driver who has never earned', async () => {
    const db = buildDb();
    db.driverWallet.findUnique.mockResolvedValue(null);

    const summary = await getDriverWalletSummary('driver-never-earned', db as never);

    expect(summary).toEqual({
      driverProfileId: 'driver-never-earned',
      availableBalance: '0.0000',
      pendingBalance: '0.0000',
      reservedBalance: '0.0000',
      totalEarned: '0.0000',
      totalSettled: '0.0000',
      currency: 'INR',
    });
    expect(db.driverWallet.create).not.toHaveBeenCalled();
  });
});
