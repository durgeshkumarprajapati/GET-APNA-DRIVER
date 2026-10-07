import type { Db } from '@/shared/database/prisma';
import { getCustomerLifecycleStatus } from '@/modules/customer/application/services/customer-retention-engine-service';
import { getViralReferralHub } from '@/modules/identity/application/services/referral-growth3-service';
import { getUnifiedOffersLoyalty3 } from '@/modules/loyalty/application/services/offers-loyalty3-service';
import { getCustomerReferralDashboard } from '@/modules/identity/application/services/referral-service';
import { getUnifiedOffersAndRewardsCenter } from '@/modules/loyalty/application/offers-rewards-center-service';
import { validateCouponForPreview } from '@/modules/promotion/application/services/promotion-eligibility-service';

jest.mock('@/modules/identity/application/services/referral-service', () => ({
  getCustomerReferralDashboard: jest.fn(),
}));
jest.mock('@/modules/identity/application/services/viral-referral-service', () => ({
  generateReferralQrDataUrl: jest.fn(() => 'data:image/svg+xml;charset=utf-8,mock'),
}));
jest.mock('@/modules/loyalty/application/offers-rewards-center-service', () => ({
  getUnifiedOffersAndRewardsCenter: jest.fn(),
}));
jest.mock('@/modules/promotion/application/services/promotion-eligibility-service', () => ({
  validateCouponForPreview: jest.fn(),
}));

const mockGetCustomerReferralDashboard = getCustomerReferralDashboard as jest.Mock;
const mockGetUnifiedOffersAndRewardsCenter = getUnifiedOffersAndRewardsCenter as jest.Mock;
const mockValidateCouponForPreview = validateCouponForPreview as jest.Mock;

type MockDb = Partial<Db> & Record<string, unknown>;

describe('Phases 104, 105 & 106 — Retention Engine, Referral 3.0 & Offers Loyalty 3.0', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Phase 104 — Customer Retention Engine', () => {
    it('evaluates lifecycle stage and reminders from real data, with a real existing promo code attached', async () => {
      const mockDb: MockDb = {
        booking: {
          count: jest.fn().mockResolvedValue(6),
          findFirst: jest.fn().mockResolvedValue({
            id: 'bkg-1',
            pickupAddress: 'Indiranagar',
            bookingType: 'ONE_WAY',
            createdAt: new Date(Date.now() - 10 * 86400000),
          }),
        } as unknown as Db['booking'],
        customerFavoriteDriver: {
          findFirst: jest.fn().mockResolvedValue({
            driverProfile: {
              displayName: null,
              firstName: 'Ramesh',
              lastName: 'Kumar',
              ratingSummary: { averageRating: '4.80' },
            },
          }),
        } as unknown as Db['customerFavoriteDriver'],
        promotion: {
          findFirst: jest.fn().mockResolvedValue({ code: 'WEEKEND20' }),
        } as unknown as Db['promotion'],
      };

      const status = await getCustomerLifecycleStatus('cust-101', mockDb as Db);

      expect(status.stage).toBe('LOYAL');
      expect(status.activeReminders.length).toBeGreaterThan(0);
      expect(status.activeReminders[0].triggerType).toBe('BOOK_AGAIN_REMINDER');
      // A prior version attached a fake code ('REPEAT15') that doesn't
      // exist in the system — now only a real active promotion is cited.
      expect(status.activeReminders[0].discountOfferCode).toBe('WEEKEND20');
      expect(status.preferredDriverName).toBe('Ramesh Kumar (Rating: 4.8)');
      // No NPS survey system exists — never a fabricated score.
      expect(status.npsScore).toBeUndefined();
    });

    it('omits preferredDriverName and discountOfferCode honestly when there is no real favorite driver or active promotion', async () => {
      const mockDb: MockDb = {
        booking: {
          count: jest.fn().mockResolvedValue(0),
          findFirst: jest.fn().mockResolvedValue(null),
        } as unknown as Db['booking'],
        customerFavoriteDriver: {
          findFirst: jest.fn().mockResolvedValue(null),
        } as unknown as Db['customerFavoriteDriver'],
        promotion: { findFirst: jest.fn().mockResolvedValue(null) } as unknown as Db['promotion'],
      };

      const status = await getCustomerLifecycleStatus('cust-202', mockDb as Db);

      expect(status.preferredDriverName).toBeUndefined();
      expect(status.stage).toBe('NEW');
    });
  });

  describe('Phase 105 — Referral & Viral Growth 3.0', () => {
    it('reuses the real referral dashboard instead of a broken referrerId query', async () => {
      mockGetCustomerReferralDashboard.mockResolvedValue({
        referralCode: 'GETDRIVER2026',
        shareUrl: 'https://getapnadriver.com/register?ref=GETDRIVER2026',
        rewardedReferrals: 3,
        totalEarnedRewards: 450,
      });

      const hub = await getViralReferralHub('user-101', 'https://getapnadriver.com');

      expect(mockGetCustomerReferralDashboard).toHaveBeenCalledWith(
        'user-101',
        'https://getapnadriver.com',
        expect.anything(),
      );
      expect(hub.referralCode).toBe('GETDRIVER2026');
      expect(hub.successfulAttributionsCount).toBe(3);
      // A prior version fabricated totalEarningsAmount as count * 150 —
      // now the real summed reward amount.
      expect(hub.totalEarningsAmount).toBe(450);
      expect(hub.allMilestones[0].actionableCopy).toContain('Invite 2 friends');
      expect(hub.whatsAppShareText).toContain('GETDRIVER2026');
    });
  });

  describe('Phase 106 — Offers & Loyalty 3.0', () => {
    it('consolidates real active promotions with real per-user eligibility and real tier progress', async () => {
      mockGetUnifiedOffersAndRewardsCenter.mockResolvedValue({
        currentLoyaltyAccount: {
          pointsBalance: 850,
          currentTier: 'Gold Executive',
          pointsToNextTier: 150,
        },
        tierComparisons: [
          { tierName: 'Silver Chauffeur', minPointsRequired: 500, isCurrentTier: false },
          { tierName: 'Gold Executive', minPointsRequired: 2000, isCurrentTier: true },
          { tierName: 'Platinum Elite', minPointsRequired: 5000, isCurrentTier: false },
        ],
        activePromotions: [
          {
            id: 'promo-1',
            code: 'WEEKEND20',
            name: 'Weekend Special',
            description: '20% off weekend rides',
            discountValue: '20% OFF',
            expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
          },
        ],
      });
      mockValidateCouponForPreview.mockResolvedValue({
        valid: true,
        errorCode: null,
        errorMessage: null,
      });

      const data = await getUnifiedOffersLoyalty3('cust-101', {} as Db);

      expect(data.availableOffers.length).toBe(1);
      expect(data.availableOffers[0].code).toBe('WEEKEND20');
      expect(data.availableOffers[0].isEligible).toBe(true);
      expect(data.membershipCard.tierName).toBe('Gold Executive');
      expect(data.membershipCard.pointsToNextReward).toBe(150);
      expect(data.membershipCard.actionableText).toContain('Gold Executive');
      expect(data.membershipCard.actionableText).toContain('points');
    });

    it('marks an offer ineligible when the real coupon engine rejects it', async () => {
      mockGetUnifiedOffersAndRewardsCenter.mockResolvedValue({
        currentLoyaltyAccount: {
          pointsBalance: 0,
          currentTier: 'Bronze Member',
          pointsToNextTier: 500,
        },
        tierComparisons: [{ tierName: 'Bronze Member', minPointsRequired: 0, isCurrentTier: true }],
        activePromotions: [
          {
            id: 'promo-2',
            code: 'WELCOME50',
            name: 'First Ride Special',
            description: '50% off first ride',
            discountValue: '50% OFF',
            expiresAt: null,
          },
        ],
      });
      mockValidateCouponForPreview.mockResolvedValue({
        valid: false,
        errorCode: 'CUSTOMER_NOT_ELIGIBLE',
        errorMessage: 'This coupon is valid for your first ride only.',
      });

      const data = await getUnifiedOffersLoyalty3('cust-303', {} as Db);

      expect(data.availableOffers[0].isEligible).toBe(false);
      expect(data.availableOffers[0].ineligibilityReason).toBe(
        'This coupon is valid for your first ride only.',
      );
    });
  });
});
