import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  PerformanceBudgetReportDTO,
  PerformanceBudgetItemDTO,
} from '../../domain/performance-budget-types';

/**
 * Phase 112 — Performance & Mobile Excellence 2.0 Service
 * Defines performance latency budgets:
 * Dashboard API < 300ms, Booking validation < 500ms, Primary interaction < 100ms, Realtime update < 2s.
 *
 * A prior version reported specific fabricated "actual" latencies (145ms,
 * 220ms, 42ms, 650ms) that always passed — there is no real request-timing
 * telemetry persisted anywhere in this schema to measure these from (that
 * would require new APM instrumentation, out of scope here), so claiming
 * specific numbers would be exactly the kind of fabricated metric this
 * platform's Phase 101 trust audit exists to catch. The budgets
 * (targets) are real configured goals; actual measurements are honestly
 * reported as not yet instrumented rather than invented.
 */
export async function getPerformanceBudgetReport(
  _db: Db = prisma,
): Promise<PerformanceBudgetReportDTO> {
  const budgets: PerformanceBudgetItemDTO[] = [
    {
      metricName: 'Dashboard API Response Time',
      targetLatencyMs: 300,
      actualLatencyMs: null,
      isWithinBudget: null,
      statusGrade: 'NOT_MEASURED',
    },
    {
      metricName: 'Booking Validation Latency',
      targetLatencyMs: 500,
      actualLatencyMs: null,
      isWithinBudget: null,
      statusGrade: 'NOT_MEASURED',
    },
    {
      metricName: 'Primary Interaction Latency',
      targetLatencyMs: 100,
      actualLatencyMs: null,
      isWithinBudget: null,
      statusGrade: 'NOT_MEASURED',
    },
    {
      metricName: 'Realtime Location Update Latency',
      targetLatencyMs: 2000,
      actualLatencyMs: null,
      isWithinBudget: null,
      statusGrade: 'NOT_MEASURED',
    },
  ];

  return {
    overallStatus: 'NOT_MEASURED',
    budgets,
    realtimeUpdateLatencyMs: null,
    evaluatedAt: new Date().toISOString(),
  };
}
