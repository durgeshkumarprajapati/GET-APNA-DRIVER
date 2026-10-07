export type GrowthFunnelStep =
  | 'EXPOSURE'
  | 'INTERACTION'
  | 'BOOKING_STARTED'
  | 'BOOKING_COMPLETED'
  | 'SERVICE_COMPLETED'
  | 'REPEAT_BOOKING';

export interface ExperimentFunnelMetricDTO {
  experimentKey: string;
  variant: 'control' | 'treatment_a' | 'treatment_b';
  step: GrowthFunnelStep;
  count: number;
  conversionFromPreviousStepPercent: number;
}

export interface GrowthExperimentReportDTO {
  experimentKey: string;
  experimentTitle: string;
  primaryMetric: string; // e.g. "Completed Services & 30d Retention"
  totalExposures: number;
  winningVariant?: string;
  funnelBreakdown: ExperimentFunnelMetricDTO[];
}
