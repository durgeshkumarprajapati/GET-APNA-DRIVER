export type InactiveStage = 'DAY_14_REMINDER' | 'DAY_30_OFFER' | 'DAY_60_REACTIVATION';

export interface InactiveUserCampaignDTO {
  campaignId: string;
  stage: InactiveStage;
  inactiveDays: number;
  targetedUserCount: number;
  campaignTitle: string;
  offerCodeAttached?: string;
  frequencyCapPerWeek: number; // Max 1 per week
  quietHoursEnforced: boolean; // 10 PM - 8 AM quiet hours
  status: 'ACTIVE' | 'SCHEDULED';
}

export interface CustomerReengagementScheduleDTO {
  totalDormantUsersCount: number;
  activeCampaigns: InactiveUserCampaignDTO[];
}
