const mockTx = {
  driverCoupon: { findUnique: jest.fn(), update: jest.fn() },
  driverCouponRedemption: { findUnique: jest.fn(), create: jest.fn() },
  $queryRaw: jest.fn(),
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(mockTx)),
    driverCoupon: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    driverCouponRedemption: { findMany: jest.fn(), count: jest.fn() },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
  triggerImmediateOutboxDispatch: jest.fn(),
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn().mockResolvedValue({ id: 'driver-profile-1' }),
}));

jest.mock('@/modules/finance/application/services/ledger-service', () => ({
  postFinancialTransaction: jest.fn().mockResolvedValue({ id: 'financial-txn-coupon-1' }),
}));

jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn(),
}));

import { Prisma } from '@prisma/client';
import {
  activateDriverCoupon,
  archiveDriverCoupon,
  createDriverCoupon,
  redeemDriverCoupon,
  updateDriverCoupon,
} from '@/modules/promotion/application/services/driver-coupon-service';
import { prisma } from '@/shared/database/prisma';
import { postFinancialTransaction } from '@/modules/finance/application/services/ledger-service';
import { applyWalletChange } from '@/modules/finance/application/services/wallet-service';
import {
  DriverCouponAlreadyRedeemedError,
  DriverCouponCodeAlreadyExistsError,
  DriverCouponExpiredError,
  DriverCouponNotActiveError,
  DriverCouponNotEditableError,
  DriverCouponNotFoundError,
  DriverCouponNotYetStartedError,
  DriverCouponUsageLimitReachedError,
  InvalidDriverCouponConfigError,
  InvalidDriverCouponStatusTransitionError,
} from '@/modules/promotion/domain/driver-coupon-errors';

const mockedPrisma = prisma as unknown as {
  driverCoupon: {
    create: jest.Mock;
    update: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

const validInput = {
  code: 'WELCOME100',
  name: 'Welcome Bonus',
  creditAmount: '100.0000',
  startsAt: new Date().toISOString(),
};

describe('createDriverCoupon', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a zero or negative credit amount', async () => {
    await expect(
      createDriverCoupon('admin-1', { ...validInput, creditAmount: '0' }),
    ).rejects.toThrow(InvalidDriverCouponConfigError);
  });

  it('rejects an end date on or before the start date', async () => {
    const startsAt = new Date('2026-06-01T00:00:00.000Z').toISOString();
    const endsAt = new Date('2026-05-01T00:00:00.000Z').toISOString();
    await expect(
      createDriverCoupon('admin-1', { ...validInput, startsAt, endsAt }),
    ).rejects.toThrow(InvalidDriverCouponConfigError);
  });

  it('rejects a blank code', async () => {
    await expect(createDriverCoupon('admin-1', { ...validInput, code: '  ' })).rejects.toThrow(
      InvalidDriverCouponConfigError,
    );
  });

  it('creates a DRAFT coupon with an uppercased code on valid input', async () => {
    mockedPrisma.driverCoupon.create.mockResolvedValue({
      id: 'coupon-1',
      code: 'WELCOME100',
      name: 'Welcome Bonus',
      description: null,
      creditAmount: new Prisma.Decimal('100.0000'),
      status: 'DRAFT',
      startsAt: new Date(),
      endsAt: null,
      totalUsageLimit: null,
      totalUsageCount: 0,
      createdBy: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const coupon = await createDriverCoupon('admin-1', { ...validInput, code: 'welcome100' });

    expect(mockedPrisma.driverCoupon.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: 'WELCOME100' }) }),
    );
    expect(coupon.status).toBe('DRAFT');
  });

  it('surfaces a duplicate code as a clear, typed error', async () => {
    mockedPrisma.driverCoupon.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );

    await expect(createDriverCoupon('admin-1', validInput)).rejects.toThrow(
      DriverCouponCodeAlreadyExistsError,
    );
  });
});

describe('updateDriverCoupon', () => {
  afterEach(() => jest.clearAllMocks());

  it('refuses to edit a coupon that has already gone live', async () => {
    mockedPrisma.driverCoupon.findUnique.mockResolvedValue({
      id: 'coupon-1',
      status: 'ACTIVE',
    });

    await expect(updateDriverCoupon('admin-1', 'coupon-1', validInput)).rejects.toThrow(
      DriverCouponNotEditableError,
    );
  });

  it('throws when the coupon does not exist', async () => {
    mockedPrisma.driverCoupon.findUnique.mockResolvedValue(null);

    await expect(updateDriverCoupon('admin-1', 'missing', validInput)).rejects.toThrow(
      DriverCouponNotFoundError,
    );
  });
});

describe('driver coupon lifecycle transitions', () => {
  afterEach(() => jest.clearAllMocks());

  it('allows DRAFT -> ACTIVE', async () => {
    mockedPrisma.driverCoupon.findUnique.mockResolvedValue({ id: 'coupon-1', status: 'DRAFT' });
    mockedPrisma.driverCoupon.update.mockResolvedValue({
      id: 'coupon-1',
      code: 'X',
      name: 'X',
      description: null,
      creditAmount: new Prisma.Decimal('100.0000'),
      status: 'ACTIVE',
      startsAt: new Date(),
      endsAt: null,
      totalUsageLimit: null,
      totalUsageCount: 0,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await activateDriverCoupon('admin-1', 'coupon-1');
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects ARCHIVED -> ACTIVE (archived is terminal)', async () => {
    mockedPrisma.driverCoupon.findUnique.mockResolvedValue({ id: 'coupon-1', status: 'ARCHIVED' });

    await expect(activateDriverCoupon('admin-1', 'coupon-1')).rejects.toThrow(
      InvalidDriverCouponStatusTransitionError,
    );
  });

  it('allows ACTIVE -> ARCHIVED directly ("delete")', async () => {
    mockedPrisma.driverCoupon.findUnique.mockResolvedValue({ id: 'coupon-1', status: 'ACTIVE' });
    mockedPrisma.driverCoupon.update.mockResolvedValue({
      id: 'coupon-1',
      code: 'X',
      name: 'X',
      description: null,
      creditAmount: new Prisma.Decimal('100.0000'),
      status: 'ARCHIVED',
      startsAt: new Date(),
      endsAt: null,
      totalUsageLimit: null,
      totalUsageCount: 0,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await archiveDriverCoupon('admin-1', 'coupon-1');
    expect(result.status).toBe('ARCHIVED');
  });
});

describe('redeemDriverCoupon', () => {
  afterEach(() => jest.clearAllMocks());

  const activeCoupon = {
    id: 'coupon-1',
    code: 'WELCOME100',
    name: 'Welcome Bonus',
    creditAmount: new Prisma.Decimal('100.0000'),
    status: 'ACTIVE',
    startsAt: new Date(Date.now() - 86_400_000),
    endsAt: null,
    totalUsageLimit: null,
    totalUsageCount: 0,
  };

  it('throws when the code does not match any coupon', async () => {
    mockTx.driverCoupon.findUnique.mockResolvedValue(null);

    await expect(redeemDriverCoupon('driver-user-1', 'NOPE')).rejects.toThrow(
      DriverCouponNotFoundError,
    );
  });

  it('rejects redeeming a PAUSED (disabled) coupon', async () => {
    mockTx.driverCoupon.findUnique.mockResolvedValue({ ...activeCoupon, status: 'PAUSED' });

    await expect(redeemDriverCoupon('driver-user-1', 'WELCOME100')).rejects.toThrow(
      DriverCouponNotActiveError,
    );
  });

  it('rejects redeeming a coupon that has not started yet', async () => {
    mockTx.driverCoupon.findUnique.mockResolvedValue({
      ...activeCoupon,
      startsAt: new Date(Date.now() + 86_400_000),
    });

    await expect(redeemDriverCoupon('driver-user-1', 'WELCOME100')).rejects.toThrow(
      DriverCouponNotYetStartedError,
    );
  });

  it('rejects redeeming an expired coupon', async () => {
    mockTx.driverCoupon.findUnique.mockResolvedValue({
      ...activeCoupon,
      endsAt: new Date(Date.now() - 1000),
    });

    await expect(redeemDriverCoupon('driver-user-1', 'WELCOME100')).rejects.toThrow(
      DriverCouponExpiredError,
    );
  });

  it('rejects redeeming once the global usage limit is reached', async () => {
    mockTx.driverCoupon.findUnique.mockResolvedValue({
      ...activeCoupon,
      totalUsageLimit: 5,
      totalUsageCount: 5,
    });

    await expect(redeemDriverCoupon('driver-user-1', 'WELCOME100')).rejects.toThrow(
      DriverCouponUsageLimitReachedError,
    );
  });

  it('rejects a driver redeeming the same coupon twice', async () => {
    mockTx.driverCoupon.findUnique.mockResolvedValue(activeCoupon);
    mockTx.driverCouponRedemption.findUnique.mockResolvedValue({
      id: 'redemption-1',
      driverCouponId: 'coupon-1',
      driverProfileId: 'driver-profile-1',
    });

    await expect(redeemDriverCoupon('driver-user-1', 'WELCOME100')).rejects.toThrow(
      DriverCouponAlreadyRedeemedError,
    );
  });

  it('credits the wallet for the exact coupon amount and records the redemption', async () => {
    mockTx.driverCoupon.findUnique.mockResolvedValue(activeCoupon);
    mockTx.driverCouponRedemption.findUnique.mockResolvedValue(null);
    mockTx.driverCouponRedemption.create.mockResolvedValue({
      id: 'redemption-1',
      driverCouponId: 'coupon-1',
      driverProfileId: 'driver-profile-1',
      creditAmountSnapshot: new Prisma.Decimal('100.0000'),
      createdAt: new Date(),
    });

    const redemption = await redeemDriverCoupon('driver-user-1', 'welcome100');

    expect(postFinancialTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'DRIVER_COUPON_REDEEMED',
        postings: [
          { accountCode: 'DRIVER_COUPON_EXPENSE', debitAmount: '100.0000', creditAmount: '0' },
          { accountCode: 'DRIVER_PAYABLE', debitAmount: '0', creditAmount: '100.0000' },
        ],
      }),
      expect.anything(),
    );
    expect(applyWalletChange).toHaveBeenCalledWith(
      expect.objectContaining({
        driverProfileId: 'driver-profile-1',
        changeType: 'COUPON_REDEEMED',
        availableDelta: '100.0000',
      }),
      expect.anything(),
    );
    expect(mockTx.driverCoupon.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { totalUsageCount: { increment: 1 } } }),
    );
    expect(redemption.creditAmountSnapshot).toBe('100.0000');
  });

  it('converts a concurrent double-redemption race (unique constraint violation) into a typed error', async () => {
    mockTx.driverCoupon.findUnique.mockResolvedValue(activeCoupon);
    mockTx.driverCouponRedemption.findUnique.mockResolvedValue(null);
    mockTx.driverCouponRedemption.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );

    await expect(redeemDriverCoupon('driver-user-1', 'WELCOME100')).rejects.toThrow(
      DriverCouponAlreadyRedeemedError,
    );
  });
});
