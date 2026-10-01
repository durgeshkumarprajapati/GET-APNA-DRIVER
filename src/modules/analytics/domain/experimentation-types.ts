export interface FunnelStageMetric {
  stageName: 'LANDING' | 'SEARCH_DRIVER' | 'OFFER_ACCEPTED' | 'TRIP_STARTED' | 'TRIP_COMPLETED';
  visitorsCount: number;
  conversionRatePercent: number;
  dropoffCount: number;
}

export interface FunnelAnalyticsDTO {
  funnelName: string;
  totalVisitors: number;
  overallConversionRatePercent: number;
  stages: FunnelStageMetric[];
}

export interface CohortRetentionMetric {
  cohortMonth: string;
  totalUsersInCohort: number;
  retentionRate30d: number;
  retentionRate60d: number;
  retentionRate90d: number;
  repeatBookingFrequency: number;
}

export interface FeatureFlagEvaluationInput {
  experimentKey: string;
  userId: string;
  userLocale?: string;
  defaultVariant?: string;
}

export interface FeatureFlagEvaluationResult {
  experimentKey: string;
  userId: string;
  assignedVariant: 'control' | 'treatment_a' | 'treatment_b';
  isEnabled: boolean;
  trafficAllocationPercent: number;
  targetGroup: string;
}

export interface ExperimentGuardrailStatusDTO {
  experimentKey: string;
  status: 'RUNNING' | 'PAUSED' | 'ROLLED_BACK';
  totalExposures: number;
  conversionRateDeltaPercent: number;
  errorRatePercent: number;
  rollbackTriggered: boolean;
  rollbackReason?: string;
}
