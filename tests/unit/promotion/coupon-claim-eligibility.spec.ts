import {
  claimCustomerOffer,
  getClaimedCustomerOffers,
  validateCouponForPreview,
} from '@/modules/promotion/application/services/promotion-eligibility-service';
import { calculateDiscountAmount } from '@/modules/promotion/domain/discount-calculator';
import { Prisma } from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

describe('Phase 62 — Production Coupon Claim, Eligibility & Discount Management', () => {
  const mockPromotion = {
    id: 'promo-1111-1111-1111',
    code: 'SAVE50',
    name: 'Flat 50 Off',
    description: 'Get flat 50 rupees off',
    discountType: 'FIXED_AMOUNT',
    discountValue: new Prisma.Decimal('50.0000'),
    maxDiscountAmount: null,
    minBookingValue: new Prisma.Decimal('200.0000'),
    firstRideOnly: false,
    isAutomatic: false,
    status: 'ACTIVE',
    startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    totalUsageLimit: 100,
    totalUsageCount: 5,
    perUserUsageLimit: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockDb = (promoOverridden: Record<string, unknown> | null = mockPromotion, completedBookingsCount = 0, userUsageCount = 0) => {
    return {
      promotion: {
        findFirst: jest.fn().mockResolvedValue(promoOverridden ? { ...mockPromotion, ...promoOverridden } : null),
        findUnique: jest.fn().mockResolvedValue(promoOverridden ? { ...mockPromotion, ...promoOverridden } : null),
      },
      booking: {
        count: jest.fn().mockResolvedValue(completedBookingsCount),
      },
      promotionUsage: {
        count: jest.fn().mockResolvedValue(userUsageCount),
      },
    } as unknown as Db;
  };

  describe('Coupon Eligibility & Validation Preview', () => {
    it('returns valid preview and calculates discount for an active eligible coupon', async () => {
      const db = createMockDb();
      const res = await validateCouponForPreview(
        {
          code: 'SAVE50',
          fareAmount: '500.0000',
          userId: 'usr-1',
        },
        db,
      );

      expect(res.valid).toBe(true);
      expect(res.errorCode).toBeNull();
      expect(res.discountAmount).toBe('50.0000');
      expect(res.originalFare).toBe('500.0000');
      expect(res.finalFare).toBe('450.0000');
    });

    it('returns COUPON_NOT_FOUND when code does not exist', async () => {
      const db = createMockDb(null);
      const res = await validateCouponForPreview(
        {
          code: 'NONEXISTENT',
          fareAmount: '500.0000',
          userId: 'usr-1',
        },
        db,
      );

      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('COUPON_NOT_FOUND');
    });

    it('returns COUPON_EXPIRED when end date has passed', async () => {
      const db = createMockDb({
        endsAt: new Date(Date.now() - 60000), // 1 min ago
      });
      const res = await validateCouponForPreview(
        {
          code: 'SAVE50',
          fareAmount: '500.0000',
          userId: 'usr-1',
        },
        db,
      );

      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('COUPON_EXPIRED');
    });

    it('returns MINIMUM_AMOUNT_NOT_MET when fare is below minimum booking value', async () => {
      const db = createMockDb({
        minBookingValue: new Prisma.Decimal('500.0000'),
      });

      const res = await validateCouponForPreview(
        {
          code: 'SAVE50',
          fareAmount: '200.0000', // Below 500
          userId: 'usr-1',
        },
        db,
      );

      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('MINIMUM_AMOUNT_NOT_MET');
    });

    it('returns CUSTOMER_NOT_ELIGIBLE for first-ride coupon when customer has previous rides', async () => {
      const db = createMockDb({ firstRideOnly: true }, 2); // 2 completed trips
      const res = await validateCouponForPreview(
        {
          code: 'SAVE50',
          fareAmount: '500.0000',
          userId: 'usr-1',
        },
        db,
      );

      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('CUSTOMER_NOT_ELIGIBLE');
    });

    it('returns ALREADY_USED when per-user usage limit is reached', async () => {
      const db = createMockDb({ perUserUsageLimit: 1 }, 0, 1); // User already used 1 time
      const res = await validateCouponForPreview(
        {
          code: 'SAVE50',
          fareAmount: '500.0000',
          userId: 'usr-1',
        },
        db,
      );

      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('ALREADY_USED');
    });

    it('returns USAGE_LIMIT_REACHED when global usage limit is reached', async () => {
      const db = createMockDb({ totalUsageLimit: 10, totalUsageCount: 10 });
      const res = await validateCouponForPreview(
        {
          code: 'SAVE50',
          fareAmount: '500.0000',
          userId: 'usr-1',
        },
        db,
      );

      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('USAGE_LIMIT_REACHED');
    });
  });

  describe('Claim vs Apply Distinction', () => {
    it('claims an offer for customer account and allows retrieving claimed offers', async () => {
      const db = createMockDb();
      const claimResult = await claimCustomerOffer('c-100', 'promo-1111-1111-1111', db);

      expect(claimResult.success).toBe(true);
      expect(claimResult.promotionId).toBe('promo-1111-1111-1111');

      const claimed = await getClaimedCustomerOffers('c-100');
      expect(claimed).toContain('promo-1111-1111-1111');
    });
  });

  describe('Discount Calculation & Driver Earnings Preservation', () => {
    it('correctly calculates percentage discount capped at maxDiscountAmount', () => {
      const discount = calculateDiscountAmount({
        discountType: 'PERCENTAGE',
        discountValue: new Prisma.Decimal('20.0000'),
        maxDiscountAmount: new Prisma.Decimal('100.0000'),
        fareAmount: '1000.0000', // 20% of 1000 = 200, capped at 100
      });

      expect(discount).toBe('100.0000');
    });
  });
});
