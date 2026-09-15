import { AchievementCategory, StreakStatus } from '@prisma/client';

export { AchievementCategory, StreakStatus };

export interface DriverStreakDTO {
  currentStreak: number;
  longestStreak: number;
  lastQualifyingDate: string | null;
  streakStatus: StreakStatus;
}

export interface AchievementDefinitionDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: AchievementCategory;
  targetValue: number;
  badgeIcon: string;
  displayOrder: number;
  isActive: boolean;
}

export interface DriverAchievementProgressDTO {
  achievementId: string;
  code: string;
  name: string;
  description: string | null;
  category: AchievementCategory;
  badgeIcon: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

export interface DriverEngagementSummaryDTO {
  driverProfileId: string;
  streak: DriverStreakDTO;
  totalUnlockedCount: number;
  totalCatalogCount: number;
  recentUnlocks: {
    code: string;
    name: string;
    badgeIcon: string;
    unlockedAt: string;
  }[];
  activeProgress: DriverAchievementProgressDTO[];
  dailyGoal: {
    targetTrips: number;
    completedTrips: number;
    progressPercentage: number;
  };
  weeklyGoal: {
    targetEarnings: number;
    completedEarnings: number;
    progressPercentage: number;
  };
}

export interface DriverEngagementContext {
  driverProfileId: string;
  completedTripsCount: number;
  ratingAverage: number;
  totalRatingsCount: number;
  weeklyEarnings: number;
  currentStreakDays: number;
  isDocumentCompliant: boolean;
  dailyTripsCompletedToday: number;
  weeklyTripsCompletedThisWeek: number;
  evaluatedAt: Date;
}
