import {
  generateReferralQrDataUrl,
  generateShareableReferralPayload,
  validateReferralFraudCheck,
} from '@/modules/identity/application/services/viral-referral-service';

jest.mock('@/modules/identity/application/services/referral-service', () => ({
  generateReferralCodeForUser: jest.fn().mockResolvedValue({
    code: 'REF-TEST101',
    userId: 'user-101',
  }),
  getCustomerReferralDashboard: jest.fn().mockResolvedValue({
    referralCode: 'REF-TEST101',
    totalReferrals: 10,
    pendingReferrals: 2,
    qualifiedReferrals: 3,
    rewardedReferrals: 5,
    totalEarnedRewards: 1250,
    activeCampaigns: [],
    recentReferrals: [],
  }),
}));

describe('Phase 92 — Referral & Viral Growth 2.0', () => {
  it('generates SVG QR Code Data URL containing referral code', () => {
    const qrUrl = generateReferralQrDataUrl('REF-TEST101', 'https://getapnadriver.com/register?ref=REF-TEST101');

    expect(qrUrl).toContain('data:image/svg+xml');
    expect(qrUrl).toContain('REF-TEST101');
  });

  it('generates shareable referral payload with WhatsApp URL', async () => {
    const payload = await generateShareableReferralPayload('user-101');

    expect(payload.referralCode).toBe('REF-TEST101');
    expect(payload.shareUrl).toContain('ref=REF-TEST101');
    expect(payload.whatsappShareUrl).toContain('api.whatsapp.com');
  });

  it('prevents self-referrals in fraud check', async () => {
    const mockDb: any = {};
    const result = await validateReferralFraudCheck('user-101', 'user-101', mockDb);

    expect(result.isEligible).toBe(false);
    expect(result.reason).toBe('SELF_REFERRAL');
  });

  it('prevents referral loops in fraud check', async () => {
    const mockDb: any = {
      referral: {
        findUnique: jest.fn().mockResolvedValue({
          referrerUserId: 'user-202', // User 202 already referred user 101
        }),
      },
    };

    const result = await validateReferralFraudCheck('user-101', 'user-202', mockDb);

    expect(result.isEligible).toBe(false);
    expect(result.reason).toBe('REFERRAL_LOOP');
  });
});
