import type { ExperienceType } from './experience-types';

export const EXPERIENCE_PRIORITY_WEIGHTS: Record<ExperienceType, number> = {
  SAFETY: 100,
  RELIABILITY: 95,
  ACTIVE_TRIP: 90,
  TRIP_ACTION: 85,
  SCHEDULED_RIDE: 80,
  DRIVER_INCENTIVE: 75,
  DRIVER_GOAL: 70,
  BOOK_AGAIN: 65,
  FAVORITE_DRIVER: 60,
  LOYALTY_REWARD: 55,
  LOYALTY_PROGRESS: 50,
  PROMOTION: 45,
  SAVED_PLACE: 40,
  REFERRAL: 35,
  SUPPORT: 30,
};

export const MANDATORY_EXPERIENCE_TYPES: Set<ExperienceType> = new Set([
  'SAFETY',
  'RELIABILITY',
  'ACTIVE_TRIP',
]);

export const NON_DISMISSABLE_TYPES: Set<ExperienceType> = new Set([
  'SAFETY',
  'RELIABILITY',
  'ACTIVE_TRIP',
  'TRIP_ACTION',
]);

export const MAX_CUSTOMER_RECOMMENDATIONS = 6;
export const MAX_DRIVER_RECOMMENDATIONS = 6;
