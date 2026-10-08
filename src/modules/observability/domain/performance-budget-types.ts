export interface PerformanceBudgetItemDTO {
  metricName: string; // e.g. "Dashboard API", "Booking Validation", "Primary Interaction"
  targetLatencyMs: number;
  actualLatencyMs: number | null;
  isWithinBudget: boolean | null;
  statusGrade: 'PASS' | 'WARN' | 'FAIL' | 'NOT_MEASURED';
}

export interface PerformanceBudgetReportDTO {
  overallStatus: 'OPTIMAL' | 'DEGRADED' | 'NOT_MEASURED';
  budgets: PerformanceBudgetItemDTO[];
  realtimeUpdateLatencyMs: number | null; // Target < 2000ms
  evaluatedAt: string;
}
