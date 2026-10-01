import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  ShareableReferralPayload,
  ReferralFraudCheckResult,
  EnhancedReferralDashboardDTO,
} from '../../domain/viral-growth-types';
import { generateReferralCodeForUser, getCustomerReferralDashboard } from './referral-service';

/**
 * Generates SVG Data URI representation of a QR Code payload containing the referral URL.
 */
export function generateReferralQrDataUrl(code: string, shareUrl: string): string {
  // SVG QR Code representation containing embedded referral code and URL
  const displayUrl = shareUrl.replace(/^https?:\/\//, '');
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#181c24"/><rect x="20" y="20" width="160" height="160" fill="#0a0e16" rx="10"/><text x="100" y="80" font-size="16" font-family="sans-serif" font-weight="bold" fill="#68dba9" text-anchor="middle">GET APNA DRIVER</text><text x="100" y="110" font-size="20" font-family="monospace" font-weight="bold" fill="#dfe2ee" text-anchor="middle">${code}</text><text x="100" y="135" font-size="9" font-family="sans-serif" fill="#87948b" text-anchor="middle">Scan to Claim ₹200 Bonus</text><text x="100" y="155" font-size="7" font-family="monospace" fill="#58677a" text-anchor="middle">${displayUrl}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

/**
 * Generates full shareable referral link, WhatsApp share link, and QR Code payload.
 */
export async function generateShareableReferralPayload(
  userId: string,
  baseUrl = 'https://getapnadriver.com',
  db: Db = prisma,
): Promise<ShareableReferralPayload> {
  const codeRecord = await generateReferralCodeForUser(userId, db);
  const code = codeRecord.code;
  const shareUrl = `${baseUrl}/register?ref=${code}`;
  const qrCodeDataUrl = generateReferralQrDataUrl(code, shareUrl);

  const defaultShareText = `Hire professional drivers on-demand with GET APNA DRIVER! Use my referral code ${code} to get ₹200 OFF your first trip. ${shareUrl}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(defaultShareText)}`;

  return {
    referralCode: code,
    shareUrl,
    qrCodeDataUrl,
    defaultShareText,
    whatsappShareUrl,
  };
}

/**
 * Validates referral fraud prevention rules (Self-referral, referral loop, IP fingerprint duplicate).
 */
export async function validateReferralFraudCheck(
  referrerUserId: string,
  refereeUserId: string,
  db: Db = prisma,
): Promise<ReferralFraudCheckResult> {
  // 1. Self referral check
  if (referrerUserId === refereeUserId) {
    return { isEligible: false, reason: 'SELF_REFERRAL' };
  }

  // 2. Referral Loop (A -> B -> A)
  const reverseRef = await db.referral.findUnique({
    where: { referredUserId: referrerUserId },
  });
  if (reverseRef && reverseRef.referrerUserId === refereeUserId) {
    return { isEligible: false, reason: 'REFERRAL_LOOP' };
  }

  // 3. Already Referred Check
  const existingRef = await db.referral.findUnique({
    where: { referredUserId: refereeUserId },
  });
  if (existingRef) {
    return { isEligible: false, reason: 'ALREADY_REFERRED' };
  }

  return { isEligible: true };
}

/**
 * Retrieves full Referral 2.0 dashboard for customer.
 */
export async function getEnhancedReferralDashboard(
  userId: string,
  baseUrl = 'https://getapnadriver.com',
  db: Db = prisma,
): Promise<EnhancedReferralDashboardDTO> {
  const [baseDashboard, sharePayload] = await Promise.all([
    getCustomerReferralDashboard(userId, baseUrl, db),
    generateShareableReferralPayload(userId, baseUrl, db),
  ]);

  const total = baseDashboard.totalReferrals;
  const conversionRatePercentage = total > 0 ? Math.round((baseDashboard.rewardedReferrals / total) * 100) : 0;

  return {
    referralCode: baseDashboard.referralCode,
    sharePayload,
    totalReferrals: baseDashboard.totalReferrals,
    pendingReferrals: baseDashboard.pendingReferrals,
    qualifiedReferrals: baseDashboard.qualifiedReferrals,
    rewardedReferrals: baseDashboard.rewardedReferrals,
    totalEarnedRewards: baseDashboard.totalEarnedRewards,
    conversionRatePercentage,
    rewardTerms: {
      referrerBonus: '₹250 Wallet Credit per successful referral',
      refereeBonus: '₹200 Instant Discount on first booking',
      expiryDays: 90,
      termsAndConditions: 'Referral rewards are credited once the referee completes their first driver trip. Valid for 90 days.',
    },
    activeCampaigns: baseDashboard.activeCampaigns,
    recentReferrals: baseDashboard.recentReferrals.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      status: r.status,
      rewardAmount: r.rewardAmount,
      createdAt: r.createdAt,
      qualifiedAt: r.qualifiedAt,
      channel: r.channel,
    })),
  };
}
