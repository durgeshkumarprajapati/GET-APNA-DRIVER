import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { ViralReferralHubDTO, ReferralMilestoneDTO } from '../../domain/referral-growth3-types';
import { generateReferralCodeForUser } from './referral-service';
import { generateReferralQrDataUrl } from './viral-referral-service';

/**
 * Phase 105 — Referral & Viral Growth 3.0 Service
 * Returns actionable referral milestones ("Invite 2 friends ➔ earn ₹300"), 1-tap WhatsApp links,
 * QR Data URIs, and attribution tracking.
 */
export async function getViralReferralHub(
  userId: string,
  baseUrl = 'https://getapnadriver.com',
  db: Db = prisma,
): Promise<ViralReferralHubDTO> {
  const codeRecord = await generateReferralCodeForUser(userId, db);
  const code = codeRecord.code;
  const shareableUrl = `${baseUrl}/register?ref=${code}`;
  const qrCodeDataUrl = generateReferralQrDataUrl(code, shareableUrl);

  const successfulAttributionsCount = await db.referral.count({
    where: { referrerId: userId, status: 'REWARDED' },
  });

  const totalEarningsAmount = successfulAttributionsCount * 150;

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
    pendingEarningsAmount: 0,
    successfulAttributionsCount,
    currentMilestone: milestones[0],
    allMilestones: milestones,
  };
}
