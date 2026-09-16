import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { collectOperationsSignals } from './operations-signal-service';
import { evaluateOperationsDecisions } from './operations-decision-service';
import type { OperationsCommandSummary } from '../domain/operations-types';

/**
 * OperationsCommandService builds the complete operational command summary
 * for the Operations Command Center dashboard.
 */
export async function getOperationsCommandSummary(
  db: Db = prisma,
): Promise<OperationsCommandSummary> {
  const signals = await collectOperationsSignals(db);
  const decisions = await evaluateOperationsDecisions(db);

  const criticalCount = decisions.filter((d) => d.severity === 'CRITICAL').length;
  const highCount = decisions.filter((d) => d.severity === 'HIGH').length;

  let systemStatus: 'HEALTHY' | 'DEGRADED' | 'OUTAGE' = 'HEALTHY';
  if (criticalCount > 0 || signals.platformHealthScore < 50) {
    systemStatus = 'OUTAGE';
  } else if (highCount > 0 || signals.platformHealthScore < 85) {
    systemStatus = 'DEGRADED';
  }

  return {
    activeDecisionsCount: decisions.length,
    criticalCount,
    highCount,
    searchingBookingsCount: signals.searchingBookingsCount,
    availableDriversCount: signals.availableDriversCount,
    activeTripsCount: signals.activeTripsCount,
    activeSafetyIncidentsCount: signals.activeSafetyIncidentsCount,
    openSupportTicketsCount: signals.openSupportTicketsCount,
    platformHealthScore: signals.platformHealthScore,
    systemStatus,
    decisions,
    updatedSecondsAgo: 0,
  };
}
