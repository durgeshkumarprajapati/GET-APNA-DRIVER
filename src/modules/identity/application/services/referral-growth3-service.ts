import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { ViralReferralHubDTO, ReferralMilestoneDTO } from '../../domain/referral-growth3-types';
import { generateReferralQrDataUrl } from './viral-referral-service';
import { getCustomerReferralDashboard } from './referral-service';

/**
 * Phase 105 — Referral & Viral Growth 3.0 Service
 * Returns actionable referral milestones ("Invite 2 friends ➔ earn ₹300"), 1-tap WhatsApp links,
 * QR Data URIs, and attribution tracking.
 *
 * Reuses getCustomerReferralDashboard (the same real referral-code/stats
 * engine the Phase 92 referral dashboard uses) instead of reimplementing
 * referral counting — a prior version queried
 * `db.referral.count({ where: { referrerId: userId, ... } })`, but the real
 * column is `referrerUserId`; `referrerId` doesn't exist, so every call to
 * this endpoint threw. It also fabricated totalEarningsAmount as
 * `successfulAttributionsCount * 150`, a flat assumption disconnected from
 * each referral's real, possibly campaign-specific rewardAmount.
 */
export async function getViralReferralHub(
  userId: string,
  baseUrl = 'https://getapnadriver.com',
  db: Db = prisma,
): Promise<ViralReferralHubDTO> {
  const dashboard = await getCustomerReferralDashboard(userId, baseUrl, db);
  const code = dashboard.referralCode;
  const shareableUrl = dashboard.shareUrl;
  const qrCodeDataUrl = generateReferralQrDataUrl(code, shareableUrl);

  const successfulAttributionsCount = dashboard.rewardedReferrals;
  const totalEarningsAmount = dashboard.totalEarnedRewards;

  const milestones: ReferralMilestoneDTO[] = [
    {
      milestoneId: 'ms-2',
      friendsRequiredCount: 2,
      rewardAmount: 300,
      actionableCopy: 'Invite 2 friends ➔ earn ₹300',
      isUnlocked: successfulAttributionsCount >= 2,
      progressPercent: Math.min(100, Math.round((successfulAttributionsCount / 2) * 100)),
    },
    {
      milestoneId: 'ms-5',
      friendsRequiredCount: 5,
      rewardAmount: 1000,
      actionableCopy: 'Invite 5 friends ➔ earn ₹1,000 bonus',
      isUnlocked: successfulAttributionsCount >= 5,
      progressPercent: Math.min(100, Math.round((successfulAttributionsCount / 5) * 100)),
    },
  ];

  const whatsAppShareText = encodeURIComponent(
    `Hey! I use Get Apna Driver for reliable professional driver services. Sign up with my code ${code} and get ₹200 OFF your first ride: ${shareableUrl}`,
  );

  return {
    referralCode: code,
    shareableUrl,
    qrCodeDataUrl,
    whatsAppShareText: `https://wa.me/?text=${whatsAppShareText}`,
    socialShareText: `Get ₹200 OFF professional driver hire with code ${code}`,
    totalEarningsAmount,
    // A PENDING referral's reward amount isn't determined until it
    // qualifies (evaluateAndQualifyReferral sets it then) — there's no
    // real number to report before that, so this stays honestly 0 rather
    // than guessing one.
    pendingEarningsAmount: 0,
    successfulAttributionsCount,
    currentMilestone: milestones[0],
    allMilestones: milestones,
  };
}
