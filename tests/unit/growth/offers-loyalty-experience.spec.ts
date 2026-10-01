import {
  previewCouponSavings,
  getUnifiedOffersAndRewardsCenter,
  MEMBERSHIP_TIERS_CATALOG,
} from '@/modules/loyalty/application/offers-rewards-center-service';

describe('Phase 93 — Offers, Loyalty & Membership Experience 2.0', () => {
  it('previews transparent coupon savings for percentage promo code', async () => {
    const mockDb: any = {
      promotion: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'promo-1',
          code: 'OFF15',
          discountType: 'PERCENTAGE',
          discountValue: '15',
          status: 'ACTIVE',
        }),
      },
    };

    const preview = await previewCouponSavings('OFF15', 1000, mockDb);

    expect(preview.isValid).toBe(true);
    expect(preview.discountAmount).toBe(150);
    expect(preview.finalEstimatedFare).toBe(850);
    expect(preview.savingsMessage).toContain('150');
  });

  it('aggregates unified offers, loyalty points, and tier comparisons', async () => {
    const mockDb: any = {
      customerLoyaltyAccount: {
        findUnique: jest.fn().mockResolvedValue({
          currentPoints: 1200,
          currentTier: { name: 'Gold' },
        }),
      },
      promotion: { findMany: jest.fn().mockResolvedValue([]) },
      loyaltyReward: { findMany: jest.fn().mockResolvedValue([]) },
      loyaltyRewardRedemption: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const center = await getUnifiedOffersAndRewardsCenter('user-101', mockDb);

    expect(center.currentLoyaltyAccount.currentTier).toBe('Gold');
    expect(center.currentLoyaltyAccount.pointsBalance).toBe(1200);
    expect(center.tierComparisons.length).toBe(MEMBERSHIP_TIERS_CATALOG.length);
  });
});
