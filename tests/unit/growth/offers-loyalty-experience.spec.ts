import type { Db } from '@/shared/database/prisma';
import {
  previewCouponSavings,
  getUnifiedOffersAndRewardsCenter,
} from '@/modules/loyalty/application/offers-rewards-center-service';
import { validateCouponForPreview } from '@/modules/promotion/application/services/promotion-eligibility-service';
import { listLoyaltyTiers, evaluateTierForPoints } from '@/modules/loyalty/application/services/loyalty-tier-service';

jest.mock('@/modules/promotion/application/services/promotion-eligibility-service', () => ({
  validateCouponForPreview: jest.fn(),
}));

jest.mock('@/modules/loyalty/application/services/loyalty-tier-service', () => ({
  listLoyaltyTiers: jest.fn(),
  evaluateTierForPoints: jest.fn(),
}));

const mockValidateCouponForPreview = validateCouponForPreview as jest.Mock;
const mockListLoyaltyTiers = listLoyaltyTiers as jest.Mock;
const mockEvaluateTierForPoints = evaluateTierForPoints as jest.Mock;

type MockDb = Partial<Db> & Record<string, unknown>;

const TIERS = [
  { id: 'tier-bronze', name: 'Bronze Member', minimumLifetimePoints: 0, benefits: { description: 'Base 1x points' } },
  { id: 'tier-silver', name: 'Silver Chauffeur', minimumLifetimePoints: 500, benefits: { description: '1.15x points' } },
  { id: 'tier-gold', name: 'Gold Executive', minimumLifetimePoints: 2000, benefits: { description: '1.30x points' } },
  { id: 'tier-platinum', name: 'Platinum Elite', minimumLifetimePoints: 5000, benefits: { description: '1.50x points' } },
];

describe('Phase 93 — Offers, Loyalty & Membership Experience 2.0', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('previews coupon savings by delegating to the real validateCouponForPreview engine', async () => {
    mockValidateCouponForPreview.mockResolvedValue({
      valid: true,
      errorCode: null,
      errorMessage: null,
      promotionId: 'promo-1',
      code: 'OFF15',
      discountType: 'PERCENTAGE',
      discountValue: '15.0000',
      discountAmount: '150.0000',
      originalFare: '1000.0000',
      finalFare: '850.0000',
    });

    const preview = await previewCouponSavings('OFF15', 1000, 'user-101');

    expect(mockValidateCouponForPreview).toHaveBeenCalledWith(
      { code: 'OFF15', fareAmount: '1000', userId: 'user-101' },
      expect.anything(),
    );
    expect(preview.isValid).toBe(true);
    expect(preview.discountAmount).toBe(150);
    expect(preview.finalEstimatedFare).toBe(850);
    expect(preview.savingsMessage).toContain('150');
  });

  it('surfaces the real ineligibility reason instead of a generic message when the coupon cannot be used', async () => {
    mockValidateCouponForPreview.mockResolvedValue({
      valid: false,
      errorCode: 'CUSTOMER_NOT_ELIGIBLE',
      errorMessage: 'This coupon is valid for your first ride only.',
    });

    const preview = await previewCouponSavings('WELCOME50', 1000, 'user-101');

    expect(preview.isValid).toBe(false);
    expect(preview.ineligibilityReason).toBe('This coupon is valid for your first ride only.');
  });

  it('aggregates unified offers, loyalty points, and tier comparisons from the real seeded tier catalog', async () => {
    const mockDb: MockDb = {
      customerLoyaltyAccount: {
        findUnique: jest.fn().mockResolvedValue({
          currentPoints: 1200,
          lifetimeEarnedPoints: 2400,
          currentTier: { name: 'Gold Executive' },
        }),
      } as unknown as Db['customerLoyaltyAccount'],
      promotion: { findMany: jest.fn().mockResolvedValue([]) } as unknown as Db['promotion'],
      loyaltyReward: { findMany: jest.fn().mockResolvedValue([]) } as unknown as Db['loyaltyReward'],
      loyaltyRewardRedemption: {
        findMany: jest.fn().mockResolvedValue([]),
      } as unknown as Db['loyaltyRewardRedemption'],
    };

    mockListLoyaltyTiers.mockResolvedValue(TIERS);
    mockEvaluateTierForPoints.mockResolvedValue({ currentTier: TIERS[2], nextTier: TIERS[3] });

    const center = await getUnifiedOffersAndRewardsCenter('user-101', mockDb as Db);

    expect(center.currentLoyaltyAccount.currentTier).toBe('Gold Executive');
    expect(center.currentLoyaltyAccount.pointsBalance).toBe(1200);
    expect(center.currentLoyaltyAccount.nextTierName).toBe('Platinum Elite');
    expect(center.currentLoyaltyAccount.pointsToNextTier).toBe(5000 - 2400);
    expect(center.tierComparisons.length).toBe(TIERS.length);

    const goldComparison = center.tierComparisons.find((t) => t.tierName === 'Gold Executive');
    expect(goldComparison?.isCurrentTier).toBe(true);
    const silverComparison = center.tierComparisons.find((t) => t.tierName === 'Silver Chauffeur');
    expect(silverComparison?.isCurrentTier).toBe(false);
  });
});
