import { getCustomerLifecycleStatus } from '@/modules/customer/application/services/customer-retention-engine-service';
import { getViralReferralHub } from '@/modules/identity/application/services/referral-growth3-service';
import { getUnifiedOffersLoyalty3 } from '@/modules/loyalty/application/services/offers-loyalty3-service';

describe('Phases 104, 105 & 106 — Retention Engine, Referral 3.0 & Offers Loyalty 3.0', () => {
  it('Phase 104: evaluates customer retention lifecycle stage and active reminders', async () => {
    const mockDb: any = {
      booking: {
        count: jest.fn().mockResolvedValue(6),
        findFirst: jest.fn().mockResolvedValue({
          id: 'bkg-1',
          pickupAddress: 'Indiranagar',
          bookingType: 'ONE_WAY',
          createdAt: new Date(Date.now() - 10 * 86400000),
        }),
      },
    };

    const status = await getCustomerLifecycleStatus('cust-101', mockDb);
    expect(status.stage).toBe('LOYAL');
    expect(status.activeReminders.length).toBeGreaterThan(0);
    expect(status.activeReminders[0].triggerType).toBe('BOOK_AGAIN_REMINDER');
  });

  it('Phase 105: provides viral referral hub with actionable milestone copy', async () => {
    const mockDb: any = {
      userReferralCode: { findUnique: jest.fn().mockResolvedValue({ code: 'GETDRIVER2026' }) },
      referral: { count: jest.fn().mockResolvedValue(3) },
    };

    const hub = await getViralReferralHub('user-101', 'https://getapnadriver.com', mockDb);
    expect(hub.referralCode).toBe('GETDRIVER2026');
    expect(hub.allMilestones[0].actionableCopy).toContain('Invite 2 friends');
    expect(hub.whatsAppShareText).toContain('GETDRIVER2026');
  });

  it('Phase 106: consolidates available offer cards and loyalty membership progress', async () => {
    const mockDb: any = {
      customerLoyaltyAccount: {
        findUnique: jest.fn().mockResolvedValue({
          currentPoints: 850,
          currentTier: { name: 'Gold Member' },
        }),
      },
    };

    const data = await getUnifiedOffersLoyalty3('cust-101', mockDb);
    expect(data.availableOffers.length).toBeGreaterThan(0);
    expect(data.membershipCard.actionableText).toContain('Gold Member');
  });
});
