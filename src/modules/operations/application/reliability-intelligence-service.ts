import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';

export interface ReliabilityIntelligenceData {
  timeframeDays: number;
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  escalatedIncidents: number;
  dismissedIncidents: number;
  recoverySuccessRate: number; // percentage 0-100
  avgResolutionTimeMinutes: number;
  recurringIncidents: Array<{
    type: string;
    count: number;
    percentage: number;
    avgResolutionMinutes: number;
  }>;
  failedRecoveryTrends: Array<{
    failureCode: string;
    count: number;
    lastOccurredAt: Date | null;
  }>;
  recoveryAttemptsSummary: {
    total: number;
    succeeded: number;
    failed: number;
    processing: number;
    cancelled: number;
  };
  dispatchPressure: {
    searchingBookingsCount: number;
    delayedBookingsCount: number;
    availableDriversCount: number;
    activeTripsCount: number;
    pressureRatio: number; // searching / max(availableDrivers, 1)
  };
}

/**
 * Computes authoritative Reliability Intelligence metrics from database tables
 * without N+1 queries.
 */
export async function getReliabilityIntelligence(
  timeframeDays = 7,
  db: Db = prisma,
): Promise<ReliabilityIntelligenceData> {
  const sinceDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

  // Run aggregate queries concurrently using Promise.all
  const [
    totalIncidents,
    activeIncidents,
    resolvedIncidents,
    escalatedIncidents,
    dismissedIncidents,
    resolvedIncidentsWithTime,
    groupedIncidentsByType,
    recoveryAttemptCounts,
    failedAttemptsGrouped,
    searchingCount,
    delayedCount,
    availableDriversCount,
    activeTripsCount,
  ] = await Promise.all([
    // 1. Total incidents in timeframe
    db.tripReliabilityIncident.count({
      where: { createdAt: { gte: sinceDate } },
    }),
    // 2. Active incidents currently
    db.tripReliabilityIncident.count({
      where: {
        status: {
          in: [
            'DETECTED',
            'INVESTIGATING',
            'CONFIRMED',
            'RECOVERY_PENDING',
            'RECOVERING',
            'ESCALATED',
          ],
        },
      },
    }),
    // 3. Resolved incidents in timeframe
    db.tripReliabilityIncident.count({
      where: {
        status: 'RESOLVED',
        createdAt: { gte: sinceDate },
      },
    }),
    // 4. Escalated incidents in timeframe
    db.tripReliabilityIncident.count({
      where: {
        status: 'ESCALATED',
        createdAt: { gte: sinceDate },
      },
    }),
    // 5. Dismissed incidents in timeframe
    db.tripReliabilityIncident.count({
      where: {
        status: 'DISMISSED',
        createdAt: { gte: sinceDate },
      },
    }),
    // 6. Resolved incidents with resolution timestamps for avg calculation
    db.tripReliabilityIncident.findMany({
      where: {
        status: 'RESOLVED',
        resolvedAt: { not: null },
        createdAt: { gte: sinceDate },
      },
      select: {
        type: true,
        detectedAt: true,
        resolvedAt: true,
      },
    }),
    // 7. Grouped incidents by type
    db.tripReliabilityIncident.groupBy({
      by: ['type'],
      where: { createdAt: { gte: sinceDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    // 8. Recovery attempt counts by status
    db.tripReliabilityRecoveryAttempt.groupBy({
      by: ['status'],
      where: { startedAt: { gte: sinceDate } },
      _count: { id: true },
    }),
    // 9. Failed recovery attempt trends grouped by failure code
    db.tripReliabilityRecoveryAttempt.groupBy({
      by: ['failureCode'],
      where: {
        status: 'FAILED',
        startedAt: { gte: sinceDate },
        failureCode: { not: null },
      },
      _count: { id: true },
      _max: { startedAt: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    // 10. Operational dispatch metrics: searching bookings
    db.booking.count({
      where: { status: 'SEARCHING_DRIVER' },
    }),
    // 11. Delayed searching bookings (> 3 minutes searching)
    db.booking.count({
      where: {
        status: 'SEARCHING_DRIVER',
        createdAt: { lte: new Date(Date.now() - 3 * 60 * 1000) },
      },
    }),
    // 12. Available idle drivers
    db.driverProfile.count({
      where: { availabilityStatus: 'AVAILABLE', approvalStatus: 'APPROVED' },
    }),
    // 13. Active trips
    db.booking.count({
      where: {
        status: { in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_IN_PROGRESS'] },
      },
    }),
  ]);

  // Calculate resolution time metrics
  let totalResolutionTimeMinutes = 0;
  const resolutionTimesByType: Record<string, { count: number; totalMinutes: number }> = {};

  for (const inc of resolvedIncidentsWithTime) {
    if (inc.resolvedAt && inc.detectedAt) {
      const minutes = Math.max(0, (inc.resolvedAt.getTime() - inc.detectedAt.getTime()) / 60000);
      totalResolutionTimeMinutes += minutes;

      if (!resolutionTimesByType[inc.type]) {
        resolutionTimesByType[inc.type] = { count: 0, totalMinutes: 0 };
      }
      resolutionTimesByType[inc.type].count += 1;
      resolutionTimesByType[inc.type].totalMinutes += minutes;
    }
  }

  const avgResolutionTimeMinutes =
    resolvedIncidentsWithTime.length > 0
      ? Math.round((totalResolutionTimeMinutes / resolvedIncidentsWithTime.length) * 10) / 10
      : 0;

  // Build recurring incidents list
  const grandTotalIncidents = Math.max(totalIncidents, 1);
  const recurringIncidents = groupedIncidentsByType.map((group) => {
    const count = group._count.id;
    const percentage = Math.round((count / grandTotalIncidents) * 1000) / 10;
    const typeStats = resolutionTimesByType[group.type];
    const avgResMinutes =
      typeStats && typeStats.count > 0
        ? Math.round((typeStats.totalMinutes / typeStats.count) * 10) / 10
        : 0;

    return {
      type: group.type,
      count,
      percentage,
      avgResolutionMinutes: avgResMinutes,
    };
  });

  // Calculate recovery attempt statistics
  const attemptsByStatusMap: Record<string, number> = {};
  let totalAttempts = 0;
  for (const row of recoveryAttemptCounts) {
    attemptsByStatusMap[row.status] = row._count.id;
    totalAttempts += row._count.id;
  }

  const succeededAttempts = attemptsByStatusMap['SUCCEEDED'] || 0;
  const failedAttempts = attemptsByStatusMap['FAILED'] || 0;
  const processingAttempts = attemptsByStatusMap['PROCESSING'] || 0;
  const cancelledAttempts = attemptsByStatusMap['CANCELLED'] || 0;

  const recoverySuccessRate =
    totalAttempts > 0 ? Math.round((succeededAttempts / totalAttempts) * 1000) / 10 : 100;

  // Build failed recovery trends
  const failedRecoveryTrends = failedAttemptsGrouped.map((row) => ({
    failureCode: row.failureCode || 'UNKNOWN_FAILURE',
    count: row._count.id,
    lastOccurredAt: row._max.startedAt ?? null,
  }));

  const pressureRatio =
    availableDriversCount > 0
      ? Math.round((searchingCount / availableDriversCount) * 100) / 100
      : searchingCount > 0
        ? 2.0
        : 0;

  return {
    timeframeDays,
    totalIncidents,
    activeIncidents,
    resolvedIncidents,
    escalatedIncidents,
    dismissedIncidents,
    recoverySuccessRate,
    avgResolutionTimeMinutes,
    recurringIncidents,
    failedRecoveryTrends,
    recoveryAttemptsSummary: {
      total: totalAttempts,
      succeeded: succeededAttempts,
      failed: failedAttempts,
      processing: processingAttempts,
      cancelled: cancelledAttempts,
    },
    dispatchPressure: {
      searchingBookingsCount: searchingCount,
      delayedBookingsCount: delayedCount,
      availableDriversCount,
      activeTripsCount,
      pressureRatio,
    },
  };
}
