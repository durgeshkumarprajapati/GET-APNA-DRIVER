export type ExperienceType =
  | 'BOOK_AGAIN'
  | 'FAVORITE_DRIVER'
  | 'SAVED_PLACE'
  | 'SCHEDULED_RIDE'
  | 'LOYALTY_PROGRESS'
  | 'LOYALTY_REWARD'
  | 'PROMOTION'
  | 'REFERRAL'
  | 'ACTIVE_TRIP'
  | 'TRIP_ACTION'
  | 'DRIVER_INCENTIVE'
  | 'DRIVER_GOAL'
  | 'SUPPORT'
  | 'RELIABILITY'
  | 'SAFETY';

export type ExperienceCategory = 'CUSTOMER' | 'DRIVER' | 'COMMON';

export type ExperienceActionType =
  | 'OPEN_BOOKING_PREFILLED'
  | 'NAVIGATE_PAGE'
  | 'TRIGGER_SUPPORT'
  | 'VIEW_SCHEDULED_RIDE'
  | 'REDEEM_REWARD'
  | 'COPY_REFERRAL'
  | 'GO_ONLINE'
  | 'VIEW_INCENTIVE';

export interface ExperienceActionPayload {
  type: ExperienceActionType;
  targetUrl?: string;
  payload?: Record<string, unknown>;
}

export interface ExperienceRecommendation {
  id: string;
  type: ExperienceType;
  category: ExperienceCategory;
  title: string;
  description: string;
  reason: string;
  priority: number; // 0-100 deterministic priority
  isDismissable: boolean;
  isMandatory: boolean;
  fingerprint: string;
  action: ExperienceActionPayload;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
}

export interface ExperienceMetrics {
  totalGenerated: number;
  totalDismissed: number;
  latencyMs: number;
  generatedByType: Record<string, number>;
  generatedByCategory: Record<string, number>;
  rulesExecutedCount: number;
  errorCount: number;
  lastGeneratedAt: string;
}
