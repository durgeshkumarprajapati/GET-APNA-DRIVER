import type { IncentiveType, IncentiveProgressStatus } from '@prisma/client';

export interface CreateIncentiveCampaignInput {
  name: string;
  description?: string | null;
  incentiveType: IncentiveType;
  targetValue: number | string;
  rewardAmount: number | string;
  startAt: Date | string;
  endAt: Date | string;
  timezone?: string;
  configuration?: Record<string, unknown> | null;
}

export interface UpdateIncentiveCampaignInput {
  name?: string;
  description?: string | null;
  targetValue?: number | string;
  rewardAmount?: number | string;
  startAt?: Date | string;
  endAt?: Date | string;
  configuration?: Record<string, unknown> | null;
}

export interface DriverEarningsSummary {
  driverProfileId: string;
  todayEarnings: string;
  completedTripsToday: number;
  averageFarePerTrip: string;
  periodEarnings: string;
  periodTrips: number;
  availableBalance: string;
  pendingBalance: string;
  totalEarned: string;
  currency: string;
}

export interface DriverIncentiveProgressDTO {
  id: string;
  campaignId: string;
  campaignName: string;
  description: string | null;
  incentiveType: IncentiveType;
  status: IncentiveProgressStatus;
  currentValue: number;
  targetValue: number;
  rewardAmount: number;
  progressPercentage: number;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  startAt: string;
  endAt: string;
}

export interface DriverGoalDTO {
  driverProfileId: string;
  dailyTripGoal: number;
  completedTripsToday: number;
  dailyTripProgressPercentage: number;
  weeklyEarningsGoal: number;
  earningsThisWeek: number;
  weeklyEarningsProgressPercentage: number;
}
