export interface ShareableReferralPayload {
  referralCode: string;
  shareUrl: string;
  qrCodeDataUrl: string;
  defaultShareText: string;
  whatsappShareUrl: string;
}

export interface ReferralFraudCheckResult {
  isEligible: boolean;
  reason?: 'SELF_REFERRAL' | 'REFERRAL_LOOP' | 'ALREADY_REFERRED' | 'IP_FINGERPRINT_DUPLICATE' | 'CAMPAIGN_EXPIRED';
}

export interface EnhancedReferralDashboardDTO {
  referralCode: string;
  sharePayload: ShareableReferralPayload;
  totalReferrals: number;
  pendingReferrals: number;
  qualifiedReferrals: number;
  rewardedReferrals: number;
  totalEarnedRewards: number;
  conversionRatePercentage: number;
  rewardTerms: {
    referrerBonus: string;
    refereeBonus: string;
    expiryDays: number;
    termsAndConditions: string;
  };
  activeCampaigns: Array<{
    id: string;
    code: string;
    name: string;
    referrerRewardValue: number;
    refereeRewardValue: number | null;
    endsAt: Date | null;
  }>;
  recentReferrals: Array<{
    id: string;
    displayName: string;
    status: string;
    rewardAmount: number | null;
    createdAt: Date;
    qualifiedAt: Date | null;
    channel: string | null;
  }>;
}
