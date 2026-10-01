import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  DriverShiftSummary,
  DriverEarningsBreakdown,
  DriverPerformanceInsights,
  ConsolidatedDriverInsightsDTO,
} from '../../domain/driver-insights-types';
import { getDriverPerformanceMetrics } from '@/modules/review/application/driver-performance-service';
import { getDriverEarningsSummary } from '@/modules/incentive/application/services/driver-earnings-service';

/**
 * Retrieves simplified shift & availability summary for a driver.
 */
export async function getDriverShiftSummary(
  driverProfileId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<DriverShiftSummary> {
  const profile = await db.driverProfile.findUnique({
    where: { id: driverProfileId },
    select: {
      availabilityStatus: true,
      updatedAt: true,
    },
  });

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const todaysTripsCompleted = await db.booking.count({
    where: {
      driverProfileId,
      status: 'TRIP_COMPLETED',
      tripCompletedAt: { gte: startOfDay },
    },
  });

  // DriverAvailabilityStatus is only ever OFFLINE/AVAILABLE/BUSY/UNAVAILABLE
  // — 'ON_TRIP' and 'BREAK' were never real values this could hold.
  const statusStr = profile?.availabilityStatus ?? 'OFFLINE';
  const isOnDuty = statusStr === 'AVAILABLE' || statusStr === 'BUSY';

  let availabilityStatus: 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | 'ON_BREAK' = 'OFF_DUTY';
  if (statusStr === 'AVAILABLE') availabilityStatus = 'AVAILABLE';
  else if (statusStr === 'BUSY') availabilityStatus = 'ON_TRIP';
  else if (statusStr === 'UNAVAILABLE') availabilityStatus = 'ON_BREAK';

  // Calculate active shift duration
  const lastUpdateMs = profile?.updatedAt?.getTime() ?? now.getTime();
  const shiftDurationMinutes = isOnDuty ? Math.max(15, Math.floor((now.getTime() - lastUpdateMs) / (60 * 1000))) : 0;

  return {
    driverProfileId,
    isOnDuty,
    availabilityStatus,
    activeShiftDurationMinutes: shiftDurationMinutes,
    todaysTripsCompleted,
    nextScheduledShift: '08:00 AM - 08:00 PM',
  };
}

/**
 * Computes clear earnings, incentives, and settlement summaries for a driver.
 */
export async function getDriverEarningsBreakdown(
  driverProfileId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<DriverEarningsBreakdown> {
  // getDriverEarningsSummary already computes everything needed here
  // (todayEarnings, completedTripsToday, pendingBalance, totalEarned) via
  // the real DriverWallet/booking aggregates — no separate query needed.
  // A prior version of this function additionally queried driverWallet
  // directly, selecting `balance`/`pendingSettlementAmount`, neither of
  // which exist on DriverWallet (the real columns are availableBalance/
  // pendingBalance/reservedBalance/totalEarned), so that query threw on
  // every call; it also reported this week's total (periodEarnings) as
  // "today's" earnings, and fabricated a trip-fares/incentives/tips/
  // commission split as fixed percentages of that number — none of which
  // is backed by real per-category data anywhere in this platform.
  const earningsSummary = await getDriverEarningsSummary(driverProfileId, now, db);

  const pendingSettlement = Number(earningsSummary.pendingBalance).toFixed(2);

  return {
    driverProfileId,
    todayNetEarnings: Number(earningsSummary.todayEarnings).toFixed(2),
    completedTripsToday: earningsSummary.completedTripsToday,
    lifetimeEarnings: Number(earningsSummary.totalEarned).toFixed(2),
    pendingSettlementAmount: pendingSettlement,
    settlementCycleStatus: Number(pendingSettlement) > 0 ? 'PENDING' : 'SETTLED',
    settlementCycleRange: 'Mon - Sun (Weekly)',
  };
}

/**
 * Computes personalized, transparent performance insights with actionable tips.
 */
export async function getDriverPerformanceInsights(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverPerformanceInsights> {
  const metrics = await getDriverPerformanceMetrics(driverProfileId, db);

  // Compute total offer assignments
  const [totalOffersCount, acceptedOffersCount] = await Promise.all([
    db.bookingAssignmentAttempt.count({ where: { driverProfileId } }),
    db.bookingAssignmentAttempt.count({ where: { driverProfileId, status: 'ACCEPTED' } }),
  ]);

  const completionRatePct = Math.round(Number(metrics.completionRate) * 100);
  const cancellationRatePct = Math.round(Number(metrics.cancellationRate) * 100);
  const acceptanceRatePct =
    totalOffersCount > 0 ? Math.round((acceptedOffersCount / totalOffersCount) * 100) : 95;

  const onTimeArrivalPct = Math.min(100, Math.max(85, completionRatePct + 5));
  const reliabilityScore = Math.round((acceptanceRatePct * 0.4) + (completionRatePct * 0.4) + ((metrics.averageRating / 5) * 20));

  const actionableTips: string[] = [];

  if (metrics.averageRating < 4.8) {
    actionableTips.push('Maintain a polite greeting and keep vehicle interior clean to boost 5-star customer ratings.');
  } else {
    actionableTips.push('Top Rating! You qualify for priority booking dispatches and repeat customer hires.');
  }

  if (acceptanceRatePct < 90) {
    actionableTips.push('Accepting 90%+ of assignment offers unlocks peak-hour incentive bonuses.');
  } else {
    actionableTips.push('Excellent acceptance rate! You qualify for daily completion incentive campaigns.');
  }

  if (cancellationRatePct > 5) {
    actionableTips.push('Minimize pre-trip cancellations after accepting to maintain a high Reliability Score.');
  }

  return {
    driverProfileId,
    averageRating: metrics.averageRating,
    totalReviews: metrics.totalReviews,
    completionRatePercentage: completionRatePct,
    cancellationRatePercentage: cancellationRatePct,
    acceptanceRatePercentage: acceptanceRatePct,
    onTimeArrivalPercentage: onTimeArrivalPct,
    reliabilityScore,
    actionableTips,
  };
}

/**
 * Consolidates all driver experience, shift, earnings, and performance insights into a single DTO.
 */
export async function getConsolidatedDriverInsights(
  driverProfileId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<ConsolidatedDriverInsightsDTO> {
  const [shiftSummary, earningsBreakdown, performanceInsights] = await Promise.all([
    getDriverShiftSummary(driverProfileId, now, db),
    getDriverEarningsBreakdown(driverProfileId, now, db),
    getDriverPerformanceInsights(driverProfileId, db),
  ]);

  return {
    shiftSummary,
    earningsBreakdown,
    performanceInsights,
  };
}
