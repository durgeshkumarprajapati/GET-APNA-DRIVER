export interface CoreWebVitalsDTO {
  lcpMs: number; // Largest Contentful Paint (target < 2500ms)
  fidMs: number; // First Input Delay (target < 100ms)
  clsScore: number; // Cumulative Layout Shift (target < 0.1)
  ttfbMs: number; // Time to First Byte (target < 800ms)
  scoreGrade: 'POOR' | 'NEEDS_IMPROVEMENT' | 'GOOD' | 'EXCELLENT';
}

export interface NetworkStateConfigDTO {
  effectiveType: 'SLOW_2G' | '2G' | '3G' | '4G' | 'WIFI';
  rttMs: number;
  downlinkMbqs: number;
  saveDataMode: boolean;
  recommendedImageQuality: number; // e.g. 60 for 3G, 85 for 4G/WIFI
  prefetchEnabled: boolean;
}

export interface QueryOptimizationReportDTO {
  queryName: string;
  executionTimeMs: number;
  rowsReturned: number;
  isCached: boolean;
  indexesUsed: string[];
  optimizationSuggestion?: string;
}

export interface MobileAccessibilityAuditDTO {
  overallScore: number; // 0 - 100
  wcagComplianceLevel: 'AA' | 'AAA';
  minTouchTargetPass: boolean;
  contrastRatioPass: boolean;
  ariaLabelsPass: boolean;
  issuesFoundCount: number;
}

export interface MobilePerformanceReportDTO {
  webVitals: CoreWebVitalsDTO;
  networkConfig: NetworkStateConfigDTO;
  queryOptimizations: QueryOptimizationReportDTO[];
  accessibilityAudit: MobileAccessibilityAuditDTO;
  evaluatedAt: string;
}
