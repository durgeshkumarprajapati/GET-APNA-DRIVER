jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));

import { Prisma } from '@prisma/client';
import { getCustomerWallet } from '@/modules/finance/application/services/customer-wallet-service';

function buildDb(overrides: Record<string, unknown> = {}) {
  return {
    payment: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    refund: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    referral: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { rewardAmount: null } }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    ...overrides,
  };
}

const CUSTOMER_ID = 'customer-1';

describe('getCustomerWallet — balance and summary', () => {
  it('returns a zero balance/summary for a customer with no transactions', async () => {
    const db = buildDb();

    const wallet = await getCustomerWallet(CUSTOMER_ID, {}, db as never);

    expect(wallet.balance).toBe('0.0000');
    expect(wallet.currency).toBe('INR');
    expect(wallet.summary).toEqual({
      totalCredits: '0.0000',
      totalDebits: '0.0000',
      totalRefunds: '0.0000',
      totalReferralRewards: '0.0000',
    });
    expect(wallet.transactions).toEqual([]);
    expect(wallet.pagination).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  });

  it('derives balance from rewarded referral earnings only (no prepaid wallet concept exists)', async () => {
    const db = buildDb({
      referral: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { rewardAmount: new Prisma.Decimal('150.0000') } }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });

    const wallet = await getCustomerWallet(CUSTOMER_ID, {}, db as never);

    expect(wallet.balance).toBe('150.0000');
    expect(wallet.summary.totalReferralRewards).toBe('150.0000');
  });

  it('sums debits (captured/partially-refunded/refunded payments), refunds, and referral rewards independently and combines refunds+rewards into totalCredits', async () => {
    const db = buildDb({
      payment: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amount: new Prisma.Decimal('850.0000') } }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      refund: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amount: new Prisma.Decimal('250.0000') } }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      referral: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { rewardAmount: new Prisma.Decimal('100.0000') } }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });

    const wallet = await getCustomerWallet(CUSTOMER_ID, {}, db as never);

    expect(wallet.summary.totalDebits).toBe('850.0000');
    expect(wallet.summary.totalRefunds).toBe('250.0000');
    expect(wallet.summary.totalReferralRewards).toBe('100.0000');
    expect(wallet.summary.totalCredits).toBe('350.0000');
  });

  it('scopes every aggregate/query to the given customerId, never a value the caller did not pass', async () => {
    const db = buildDb();

    await getCustomerWallet('customer-42', {}, db as never);

    expect(db.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ customerId: 'customer-42' }) }),
    );
    expect(db.refund.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ payment: { customerId: 'customer-42' } }),
      }),
    );
    expect(db.referral.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ referrerUserId: 'customer-42' }),
      }),
    );
  });
});

describe('getCustomerWallet — decimal safety', () => {
  it.each(['0.01', '0.10', '1.99', '999.99', '1234567.8912'])(
    'formats %s without floating-point drift',
    async (amount) => {
      const db = buildDb({
        referral: {
          aggregate: jest
            .fn()
            .mockResolvedValue({ _sum: { rewardAmount: new Prisma.Decimal(amount) } }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
        },
      });

      const wallet = await getCustomerWallet(CUSTOMER_ID, {}, db as never);

      expect(wallet.balance).toBe(new Prisma.Decimal(amount).toFixed(4));
    },
  );
});

describe('getCustomerWallet — transaction mapping', () => {
  it('maps a captured payment to a DEBIT BOOKING_PAYMENT transaction', async () => {
    const capturedAt = new Date('2026-01-05T10:00:00Z');
    const db = buildDb({
      payment: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amount: new Prisma.Decimal('850.0000') } }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'payment-1',
            bookingId: 'booking-1',
            amount: new Prisma.Decimal('850.0000'),
            currency: 'INR',
            status: 'CAPTURED',
            discountAmount: null,
            capturedAt,
            createdAt: capturedAt,
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    const wallet = await getCustomerWallet(CUSTOMER_ID, { type: 'booking_payment' }, db as never);

    expect(wallet.transactions).toEqual([
      {
        id: 'payment:payment-1',
        type: 'BOOKING_PAYMENT',
        direction: 'DEBIT',
        amount: '850.0000',
        currency: 'INR',
        status: 'CAPTURED',
        description: 'Booking payment',
        occurredAt: capturedAt.toISOString(),
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        refundId: null,
        referralId: null,
        discountAmount: null,
      },
    ]);
  });

  it('surfaces the promotion discount on a payment transaction without leaking commission/driver-earnings fields', async () => {
    const capturedAt = new Date('2026-01-05T10:00:00Z');
    const db = buildDb({
      payment: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amount: new Prisma.Decimal('800.0000') } }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'payment-2',
            bookingId: 'booking-2',
            amount: new Prisma.Decimal('800.0000'),
            currency: 'INR',
            status: 'CAPTURED',
            discountAmount: new Prisma.Decimal('50.0000'),
            capturedAt,
            createdAt: capturedAt,
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    const wallet = await getCustomerWallet(CUSTOMER_ID, { type: 'booking_payment' }, db as never);

    expect(wallet.transactions[0].discountAmount).toBe('50.0000');
    expect(wallet.transactions[0]).not.toHaveProperty('commissionAmount');
    expect(wallet.transactions[0]).not.toHaveProperty('driverEarningsAmount');
  });

  it('maps a processed refund to a CREDIT REFUND transaction carrying its booking reference', async () => {
    const processedAt = new Date('2026-01-06T10:00:00Z');
    const db = buildDb({
      refund: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amount: new Prisma.Decimal('250.0000') } }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'refund-1',
            paymentId: 'payment-1',
            amount: new Prisma.Decimal('250.0000'),
            currency: 'INR',
            status: 'PROCESSED',
            processedAt,
            createdAt: processedAt,
            payment: { bookingId: 'booking-1' },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    const wallet = await getCustomerWallet(CUSTOMER_ID, { type: 'refund' }, db as never);

    expect(wallet.transactions).toEqual([
      {
        id: 'refund:refund-1',
        type: 'REFUND',
        direction: 'CREDIT',
        amount: '250.0000',
        currency: 'INR',
        status: 'PROCESSED',
        description: 'Refund',
        occurredAt: processedAt.toISOString(),
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        refundId: 'refund-1',
        referralId: null,
        discountAmount: null,
      },
    ]);
  });

  it('only queries refunds with status PROCESSED — a pending/requested refund must never appear', async () => {
    const db = buildDb();

    await getCustomerWallet(CUSTOMER_ID, { type: 'refund' }, db as never);

    expect(db.refund.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PROCESSED' }) }),
    );
  });

  it('maps a rewarded referral to a CREDIT REFERRAL_REWARD transaction', async () => {
    const rewardedAt = new Date('2026-01-07T10:00:00Z');
    const db = buildDb({
      referral: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { rewardAmount: new Prisma.Decimal('100.0000') } }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'referral-1',
            rewardAmount: new Prisma.Decimal('100.0000'),
            rewardedAt,
            createdAt: rewardedAt,
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    const wallet = await getCustomerWallet(CUSTOMER_ID, { type: 'referral_reward' }, db as never);

    expect(wallet.transactions).toEqual([
      {
        id: 'referral:referral-1',
        type: 'REFERRAL_REWARD',
        direction: 'CREDIT',
        amount: '100.0000',
        currency: 'INR',
        status: 'REWARDED',
        description: 'Referral reward',
        occurredAt: rewardedAt.toISOString(),
        bookingId: null,
        paymentId: null,
        refundId: null,
        referralId: 'referral-1',
        discountAmount: null,
      },
    ]);
  });

  it('only queries referrals with status REWARDED', async () => {
    const db = buildDb();

    await getCustomerWallet(CUSTOMER_ID, { type: 'referral_reward' }, db as never);

    expect(db.referral.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'REWARDED' }) }),
    );
  });
});

describe('getCustomerWallet — filters', () => {
  it('type=all merges payments, refunds, and referral rewards sorted by occurredAt descending', async () => {
    const db = buildDb({
      payment: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amount: new Prisma.Decimal('850.0000') } }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'payment-1',
            bookingId: 'booking-1',
            amount: new Prisma.Decimal('850.0000'),
            currency: 'INR',
            status: 'CAPTURED',
            discountAmount: null,
            capturedAt: new Date('2026-01-01T10:00:00Z'),
            createdAt: new Date('2026-01-01T10:00:00Z'),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
      refund: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amount: new Prisma.Decimal('250.0000') } }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'refund-1',
            paymentId: 'payment-1',
            amount: new Prisma.Decimal('250.0000'),
            currency: 'INR',
            status: 'PROCESSED',
            processedAt: new Date('2026-01-03T10:00:00Z'),
            createdAt: new Date('2026-01-03T10:00:00Z'),
            payment: { bookingId: 'booking-1' },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
      referral: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { rewardAmount: new Prisma.Decimal('100.0000') } }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'referral-1',
            rewardAmount: new Prisma.Decimal('100.0000'),
            rewardedAt: new Date('2026-01-02T10:00:00Z'),
            createdAt: new Date('2026-01-02T10:00:00Z'),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    const wallet = await getCustomerWallet(CUSTOMER_ID, { type: 'all' }, db as never);

    expect(wallet.transactions.map((t) => t.id)).toEqual([
      'refund:refund-1',
      'referral:referral-1',
      'payment:payment-1',
    ]);
    expect(wallet.pagination.total).toBe(3);
  });

  it('type=credit includes only refunds and referral rewards, excluding booking payments', async () => {
    const db = buildDb({
      payment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    });

    await getCustomerWallet(CUSTOMER_ID, { type: 'credit' }, db as never);

    expect(db.payment.findMany).not.toHaveBeenCalled();
  });

  it('type=debit queries only payments (single-source path uses skip/take, not the merge path)', async () => {
    const db = buildDb();

    await getCustomerWallet(CUSTOMER_ID, { type: 'debit', page: 2, pageSize: 5 }, db as never);

    expect(db.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
    expect(db.refund.findMany).not.toHaveBeenCalled();
    expect(db.referral.findMany).not.toHaveBeenCalled();
  });
});

describe('getCustomerWallet — pagination', () => {
  it('defaults to page 1, pageSize 20', async () => {
    const db = buildDb();

    const wallet = await getCustomerWallet(CUSTOMER_ID, {}, db as never);

    expect(wallet.pagination.page).toBe(1);
    expect(wallet.pagination.pageSize).toBe(20);
  });

  it('caps pageSize at 50 even when a larger value is requested', async () => {
    const db = buildDb();

    const wallet = await getCustomerWallet(CUSTOMER_ID, { pageSize: 1000 }, db as never);

    expect(wallet.pagination.pageSize).toBe(50);
  });

  it('coerces a non-positive page to 1', async () => {
    const db = buildDb();

    const wallet = await getCustomerWallet(CUSTOMER_ID, { page: -5 }, db as never);

    expect(wallet.pagination.page).toBe(1);
  });

  it('computes totalPages from the combined count across all filtered sources', async () => {
    const db = buildDb({
      payment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(7),
      },
      refund: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(3),
      },
    });

    const wallet = await getCustomerWallet(CUSTOMER_ID, { type: 'all', pageSize: 5 }, db as never);

    expect(wallet.pagination.total).toBe(10);
    expect(wallet.pagination.totalPages).toBe(2);
  });

  it('returns totalPages 1 (never 0) when there are no transactions', async () => {
    const db = buildDb();

    const wallet = await getCustomerWallet(CUSTOMER_ID, {}, db as never);

    expect(wallet.pagination.totalPages).toBe(1);
  });
});
