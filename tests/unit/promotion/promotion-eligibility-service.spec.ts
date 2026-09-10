jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: { count: jest.fn() },
    promotion: { findMany: jest.fn(), findUnique: jest.fn() },
    promotionUsage: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  },
}));

import { Prisma } from '@prisma/client';
import {
  evaluateEligiblePromotions,
  getCustomerOffers,
  validateAndReservePromotionUsage,
} from '@/modules/promotion/application/services/promotion-eligibility-service';
import { prisma } from '@/shared/database/prisma';
import {
  PromotionAlreadyAppliedToBookingError,
  PromotionExpiredError,
  PromotionFirstRideOnlyError,
  PromotionMinimumBookingValueNotMetError,
  PromotionNotFoundError,
  PromotionPerUserUsageLimitReachedError,
  PromotionUsageLimitReachedError,
} from '@/modules/promotion/domain/errors';

function activePromotion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'promotion-1',
    code: 'SAVE20',
    name: '20% Off',
    description: null,
    discountType: 'PERCENTAGE',
    discountValue: new Prisma.Decimal('20'),
    maxDiscountAmount: null,
    minBookingValue: null,
    firstRideOnly: false,
    isAutomatic: false,
    status: 'ACTIVE',
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T00:00:00.000Z'),
    totalUsageLimit: null,
    totalUsageCount: 0,
    perUserUsageLimit: 1,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Tagged-template mock for `tx.$queryRaw` (the FOR UPDATE row lock) — asserts
// it was actually invoked, then resolves as a no-op (the lock's effect isn't
// observable in a mocked, single-threaded test; true cross-transaction
// concurrency can only be verified against a real Postgres instance).
function mockTxWithLock() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'promotion-1' }]),
    promotion: prisma.promotion,
    promotionUsage: prisma.promotionUsage,
    booking: prisma.booking,
  } as unknown as typeof prisma & { $queryRaw: jest.Mock };
}

describe('evaluateEligiblePromotions (advisory, read-only)', () => {
  afterEach(() => jest.clearAllMocks());

  it('excludes a promotion below its minimum booking value', async () => {
    (prisma.promotion.findMany as jest.Mock).mockResolvedValue([
      activePromotion({ minBookingValue: new Prisma.Decimal('500.0000') }),
    ]);
    (prisma.booking.count as jest.Mock).mockResolvedValue(1);

    const eligible = await evaluateEligiblePromotions('customer-1', '300.0000');
    expect(eligible).toHaveLength(0);
  });

  it('includes a promotion at or above its minimum booking value', async () => {
    (prisma.promotion.findMany as jest.Mock).mockResolvedValue([
      activePromotion({ minBookingValue: new Prisma.Decimal('500.0000') }),
    ]);
    (prisma.booking.count as jest.Mock).mockResolvedValue(1);

    const eligible = await evaluateEligiblePromotions('customer-1', '500.0000');
    expect(eligible).toHaveLength(1);
  });

  it('excludes a first-ride-only promotion for a customer with a completed booking', async () => {
    (prisma.promotion.findMany as jest.Mock).mockResolvedValue([
      activePromotion({ firstRideOnly: true }),
    ]);
    (prisma.booking.count as jest.Mock).mockResolvedValue(2); // has completed rides

    const eligible = await evaluateEligiblePromotions('customer-1', '300.0000');
    expect(eligible).toHaveLength(0);
  });

  it('includes a first-ride-only promotion for a customer with zero completed bookings', async () => {
    (prisma.promotion.findMany as jest.Mock).mockResolvedValue([
      activePromotion({ firstRideOnly: true }),
    ]);
    (prisma.booking.count as jest.Mock).mockResolvedValue(0);

    const eligible = await evaluateEligiblePromotions('customer-1', '300.0000');
    expect(eligible).toHaveLength(1);
  });

  it('excludes a promotion that has reached its global usage limit', async () => {
    (prisma.promotion.findMany as jest.Mock).mockResolvedValue([
      activePromotion({ totalUsageLimit: 5, totalUsageCount: 5 }),
    ]);
    (prisma.booking.count as jest.Mock).mockResolvedValue(1);

    const eligible = await evaluateEligiblePromotions('customer-1', '300.0000');
    expect(eligible).toHaveLength(0);
  });

  it('excludes a promotion this customer has already used up to their per-user limit', async () => {
    (prisma.promotion.findMany as jest.Mock).mockResolvedValue([
      activePromotion({ perUserUsageLimit: 1 }),
    ]);
    (prisma.booking.count as jest.Mock).mockResolvedValue(1);
    (prisma.promotionUsage.count as jest.Mock).mockResolvedValue(1);

    const eligible = await evaluateEligiblePromotions('customer-1', '300.0000');
    expect(eligible).toHaveLength(0);
  });

  it('a derived-expired ACTIVE promotion (endsAt passed) is excluded', async () => {
    (prisma.promotion.findMany as jest.Mock).mockResolvedValue([
      activePromotion({ endsAt: new Date('2020-01-01T00:00:00.000Z') }),
    ]);
    (prisma.booking.count as jest.Mock).mockResolvedValue(1);

    const eligible = await evaluateEligiblePromotions('customer-1', '300.0000');
    expect(eligible).toHaveLength(0);
  });
});

describe('validateAndReservePromotionUsage (authoritative, transactional)', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects an unknown promotion code', async () => {
    (prisma.promotionUsage.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.promotion.findUnique as jest.Mock).mockResolvedValue(null);
    const tx = mockTxWithLock();

    await expect(
      validateAndReservePromotionUsage(tx, {
        userId: 'customer-1',
        bookingId: 'booking-1',
        fareAmount: '1000.0000',
        promotionCode: 'NOTREAL',
      }),
    ).rejects.toThrow(PromotionNotFoundError);
  });

  it('rejects a booking that already has a promotion applied', async () => {
    (prisma.promotionUsage.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-usage' });
    const tx = mockTxWithLock();

    await expect(
      validateAndReservePromotionUsage(tx, {
        userId: 'customer-1',
        bookingId: 'booking-1',
        fareAmount: '1000.0000',
        promotionCode: 'SAVE20',
      }),
    ).rejects.toThrow(PromotionAlreadyAppliedToBookingError);
  });

  it('rejects a code-based redemption below the minimum booking value', async () => {
    (prisma.promotionUsage.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.promotion.findUnique as jest.Mock).mockResolvedValue(
      activePromotion({ minBookingValue: new Prisma.Decimal('500.0000') }),
    );
    const tx = mockTxWithLock();

    await expect(
      validateAndReservePromotionUsage(tx, {
        userId: 'customer-1',
        bookingId: 'booking-1',
        fareAmount: '300.0000',
        promotionCode: 'SAVE20',
      }),
    ).rejects.toThrow(PromotionMinimumBookingValueNotMetError);
  });

  it('rejects a first-ride-only code when the customer already has a completed ride', async () => {
    (prisma.promotionUsage.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.promotion.findUnique as jest.Mock).mockResolvedValue(
      activePromotion({ firstRideOnly: true }),
    );
    (prisma.booking.count as jest.Mock).mockResolvedValue(1);
    const tx = mockTxWithLock();

    await expect(
      validateAndReservePromotionUsage(tx, {
        userId: 'customer-1',
        bookingId: 'booking-1',
        fareAmount: '1000.0000',
        promotionCode: 'SAVE20',
      }),
    ).rejects.toThrow(PromotionFirstRideOnlyError);
  });

  it('rejects an expired code (endsAt passed)', async () => {
    (prisma.promotionUsage.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.promotion.findUnique as jest.Mock).mockResolvedValue(
      activePromotion({ endsAt: new Date('2020-01-01T00:00:00.000Z') }),
    );
    const tx = mockTxWithLock();

    await expect(
      validateAndReservePromotionUsage(tx, {
        userId: 'customer-1',
        bookingId: 'booking-1',
        fareAmount: '1000.0000',
        promotionCode: 'SAVE20',
      }),
    ).rejects.toThrow(PromotionExpiredError);
  });

  it('concurrency: the second of two sequential redemption attempts against a limit-1 promotion is rejected', async () => {
    // Simulates request A and request B both wanting the last (only) slot.
    // A single shared, mutable row stands in for the real Postgres row: the
    // FOR UPDATE lock guarantees requests serialize against exactly this
    // kind of shared state, so `update` here really does mutate what the
    // *next* `findUnique` call sees — same as a real committed increment
    // would. True cross-transaction concurrency itself can only be proven
    // against a real Postgres instance (not reachable in this sandbox).
    const row = activePromotion({ totalUsageLimit: 1, totalUsageCount: 0 });
    (prisma.promotionUsage.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.promotionUsage.count as jest.Mock).mockResolvedValue(0);
    (prisma.promotion.findUnique as jest.Mock).mockImplementation(() =>
      Promise.resolve({ ...row }),
    );
    (prisma.promotion.update as jest.Mock) = jest.fn().mockImplementation(() => {
      row.totalUsageCount += 1;
      return Promise.resolve({ ...row });
    });
    (prisma.promotionUsage.create as jest.Mock) = jest.fn().mockResolvedValue(undefined);

    const txA = mockTxWithLock();
    const resultA = await validateAndReservePromotionUsage(txA, {
      userId: 'customer-1',
      bookingId: 'booking-a',
      fareAmount: '1000.0000',
      promotionCode: 'SAVE20',
    });
    expect(resultA?.discountAmount).toBe('200.0000');
    expect(row.totalUsageCount).toBe(1);

    const txB = mockTxWithLock();
    await expect(
      validateAndReservePromotionUsage(txB, {
        userId: 'customer-2',
        bookingId: 'booking-b',
        fareAmount: '1000.0000',
        promotionCode: 'SAVE20',
      }),
    ).rejects.toThrow(PromotionUsageLimitReachedError);

    // Both attempts took the row lock — the mechanism that makes this safe
    // under real concurrent transactions.
    expect(txA.$queryRaw).toHaveBeenCalled();
    expect(txB.$queryRaw).toHaveBeenCalled();
    // The limit was never oversubscribed: still exactly one usage recorded.
    expect(prisma.promotionUsage.create).toHaveBeenCalledTimes(1);
  });

  it('rejects when a customer has already reached their per-user usage limit', async () => {
    (prisma.promotionUsage.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.promotion.findUnique as jest.Mock).mockResolvedValue(
      activePromotion({ perUserUsageLimit: 1 }),
    );
    (prisma.promotionUsage.count as jest.Mock).mockResolvedValue(1);
    const tx = mockTxWithLock();

    await expect(
      validateAndReservePromotionUsage(tx, {
        userId: 'customer-1',
        bookingId: 'booking-1',
        fareAmount: '1000.0000',
        promotionCode: 'SAVE20',
      }),
    ).rejects.toThrow(PromotionPerUserUsageLimitReachedError);
  });

  it('applies the best-discount automatic promotion when no code is given, without ever failing the booking if none qualify', async () => {
    (prisma.promotionUsage.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.promotion.findMany as jest.Mock).mockResolvedValue([]); // no automatic promotions

    const tx = mockTxWithLock();
    const result = await validateAndReservePromotionUsage(tx, {
      userId: 'customer-1',
      bookingId: 'booking-1',
      fareAmount: '1000.0000',
      promotionCode: null,
    });

    expect(result).toBeNull();
    expect(tx.$queryRaw).not.toHaveBeenCalled(); // nothing to lock — no candidate found
  });

  it('translates a duplicate-booking-usage race (P2002) into PromotionAlreadyAppliedToBookingError', async () => {
    (prisma.promotionUsage.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.promotionUsage.count as jest.Mock).mockResolvedValue(0);
    (prisma.promotion.findUnique as jest.Mock).mockResolvedValue(activePromotion());
    (prisma.promotion.update as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (prisma.promotionUsage.create as jest.Mock) = jest.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const tx = mockTxWithLock();

    await expect(
      validateAndReservePromotionUsage(tx, {
        userId: 'customer-1',
        bookingId: 'booking-1',
        fareAmount: '1000.0000',
        promotionCode: 'SAVE20',
      }),
    ).rejects.toThrow(PromotionAlreadyAppliedToBookingError);
  });
});

describe('getCustomerOffers', () => {
  afterEach(() => jest.clearAllMocks());

  it('buckets promotions into available, used, and expired', async () => {
    (prisma.promotion.findMany as jest.Mock).mockResolvedValue([
      activePromotion({ id: 'available-1' }),
      activePromotion({ id: 'used-1' }),
      activePromotion({ id: 'expired-1', endsAt: new Date('2020-01-01T00:00:00.000Z') }),
    ]);
    (prisma.promotionUsage.findMany as jest.Mock).mockResolvedValue([
      { promotionId: 'used-1', userId: 'customer-1' },
    ]);
    (prisma.booking.count as jest.Mock).mockResolvedValue(0);

    const offers = await getCustomerOffers('customer-1');

    expect(offers.available.map((o) => o.id)).toEqual(['available-1']);
    expect(offers.used.map((o) => o.id)).toEqual(['used-1']);
    expect(offers.expired.map((o) => o.id)).toEqual(['expired-1']);
  });
});
