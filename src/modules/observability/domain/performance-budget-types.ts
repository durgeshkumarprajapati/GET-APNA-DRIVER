export interface PerformanceBudgetItemDTO {
  metricName: string; // e.g. "Dashboard API", "Booking Validation", "Primary Interaction"
  targetLatencyMs: number;
  actualLatencyMs: number;
  isWithinBudget: boolean;
  statusGrade: 'PASS' | 'WARN' | 'FAIL';
}

export interface PerformanceBudgetReportDTO {
  overallStatus: 'OPTIMAL' | 'DEGRADED';
  budgets: PerformanceBudgetItemDTO[];
  realtimeUpdateLatencyMs: number; // Target < 2000ms
  evaluatedAt: string;
}
