export interface ReferralMilestoneDTO {
  milestoneId: string;
  friendsRequiredCount: number;
  rewardAmount: number;
  actionableCopy: string; // e.g. "Invite 2 friends ➔ earn ₹300"
  isUnlocked: boolean;
  progressPercent: number;
}

export interface ViralReferralHubDTO {
  referralCode: string;
  shareableUrl: string;
  qrCodeDataUrl: string;
  whatsAppShareText: string;
  socialShareText: string;
  totalEarningsAmount: number;
  pendingEarningsAmount: number;
  successfulAttributionsCount: number;
  currentMilestone: ReferralMilestoneDTO;
  allMilestones: ReferralMilestoneDTO[];
}
