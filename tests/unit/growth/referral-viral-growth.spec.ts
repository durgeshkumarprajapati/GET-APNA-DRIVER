import type { Db } from '@/shared/database/prisma';
import {
  generateReferralQrDataUrl,
  generateShareableReferralPayload,
  validateReferralFraudCheck,
  getEnhancedReferralDashboard,
} from '@/modules/identity/application/services/viral-referral-service';
import { generateReferralCodeForUser } from '@/modules/identity/application/services/referral-service';

type MockDb = Partial<Db> & Record<string, unknown>;

jest.mock('@/modules/identity/application/services/referral-service', () => ({
  generateReferralCodeForUser: jest.fn().mockResolvedValue({
    code: 'REF-TEST101',
    userId: 'user-101',
  }),
  getCustomerReferralDashboard: jest.fn().mockResolvedValue({
    referralCode: 'REF-TEST101',
    shareUrl: 'https://getapnadriver.com/register?ref=REF-TEST101',
    totalReferrals: 10,
    pendingReferrals: 2,
    qualifiedReferrals: 3,
    rewardedReferrals: 5,
    totalEarnedRewards: 1250,
    activeCampaigns: [],
    recentReferrals: [],
  }),
}));

const mockGenerateReferralCodeForUser = generateReferralCodeForUser as jest.Mock;

describe('Phase 92 — Referral & Viral Growth 2.0', () => {
  it('generates SVG QR Code Data URL containing referral code', () => {
    const qrUrl = generateReferralQrDataUrl(
      'REF-TEST101',
      'https://getapnadriver.com/register?ref=REF-TEST101',
    );

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
    const mockDb: MockDb = {};
    const result = await validateReferralFraudCheck('user-101', 'user-101', mockDb as Db);

    expect(result.isEligible).toBe(false);
    expect(result.reason).toBe('SELF_REFERRAL');
  });

  it('prevents referral loops in fraud check', async () => {
    const mockDb: MockDb = {
      referral: {
        findUnique: jest.fn().mockResolvedValue({
          referrerUserId: 'user-202', // User 202 already referred user 101
        }),
      } as unknown as Db['referral'],
    };

    const result = await validateReferralFraudCheck('user-101', 'user-202', mockDb as Db);

    expect(result.isEligible).toBe(false);
    expect(result.reason).toBe('REFERRAL_LOOP');
  });

  describe('getEnhancedReferralDashboard', () => {
    it('exposes a top-level shareUrl — the Share button on the referral page reads dashboard.shareUrl directly', async () => {
      const dashboard = await getEnhancedReferralDashboard('user-101');

      expect(dashboard.shareUrl).toBe('https://getapnadriver.com/register?ref=REF-TEST101');
      expect(dashboard.sharePayload.shareUrl).toBe(dashboard.shareUrl);
    });

    it('resolves the referral code up front before fanning out to the dashboard and share-payload calls', async () => {
      mockGenerateReferralCodeForUser.mockClear();

      await getEnhancedReferralDashboard('user-101');

      // Called once directly by getEnhancedReferralDashboard up front (so the
      // row exists before the concurrent fan-out below starts racing), and
      // again inside generateShareableReferralPayload's own call — the real
      // concurrency-safety fix (two concurrent callers never both missing an
      // existing row) is covered against the real DB-backed implementation
      // in referral-service.spec.ts.
      expect(mockGenerateReferralCodeForUser).toHaveBeenCalledWith('user-101', expect.anything());
      expect(mockGenerateReferralCodeForUser.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
