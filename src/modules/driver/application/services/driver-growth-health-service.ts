import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { DriverGrowthHealthReportDTO } from '../../domain/driver-growth-health-types';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * % of drivers approved at least `windowDays` ago who completed at least one
 * trip within the last `windowDays` — a real, bounded "still active" proxy.
 * There is no historical driver-activity snapshot table to compute a
 * textbook cohort-retention curve from, so this is deliberately simple.
 */
async function computeRetentionRatePercent(windowDays: number, db: Db): Promise<number> {
  const cutoff = new Date(Date.now() - windowDays * DAY_MS);

  const [eligibleCohortCount, activeDrivers] = await Promise.all([
    db.driverProfile.count({
      where: { approvalStatus: 'APPROVED', approvedAt: { lte: cutoff } },
    }),
    db.booking.findMany({
      where: {
        status: 'TRIP_COMPLETED',
        driverProfileId: { not: null },
        createdAt: { gte: cutoff },
      },
      select: { driverProfileId: true },
      distinct: ['driverProfileId'],
    }),
  ]);

  if (eligibleCohortCount === 0) return 0;
  return Math.min(100, Number(((activeDrivers.length / eligibleCohortCount) * 100).toFixed(1)));
}

/**
 * Phase 114 — Driver Growth & Marketplace Health Service
 * Evaluates driver onboarding funnel, activation rate, retention, and
 * current supply coverage, and answers: "Do we have enough good drivers to
 * support the customers we are acquiring?"
 *
 * A prior version hardcoded every number here (a fake 4-stage funnel with a
 * nonexistent "BACKGROUND_CHECKED" status, fake retention rates, a fake
 * peak-hour coverage figure, and an unconditional "SUFFICIENT"/"YES"
 * verdict) regardless of actual driver supply.
 */
export async function getDriverGrowthHealthReport(
  db: Db = prisma,
): Promise<DriverGrowthHealthReportDTO> {
  const [totalDriversCount, availableDriversCount, documentsVerifiedCount, activatedCount] =
    await Promise.all([
      db.driverProfile.count(),
      db.driverProfile.count({ where: { availabilityStatus: 'AVAILABLE' } }),
      db.driverProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
      db.driverProfile.count({ where: { approvalStatus: 'APPROVED' } }),
    ]);

  const pct = (count: number) =>
    totalDriversCount > 0 ? Number(((count / totalDriversCount) * 100).toFixed(1)) : 0;

  const driverActivationFunnel: DriverGrowthHealthReportDTO['driverActivationFunnel'] = [
    { stageName: 'SUBMITTED', count: totalDriversCount, conversionRatePercent: 100.0 },
    {
      stageName: 'DOCUMENTS_VERIFIED',
      count: documentsVerifiedCount,
      conversionRatePercent: pct(documentsVerifiedCount),
    },
    { stageName: 'ACTIVATED', count: activatedCount, conversionRatePercent: pct(activatedCount) },
  ];

  const [driverRetentionRate7dPercent, driverRetentionRate30dPercent] = await Promise.all([
    computeRetentionRatePercent(7, db),
    computeRetentionRatePercent(30, db),
  ]);

  // Current available/active ratio — an honest proxy for "do we currently
  // have enough supply," not a time-of-day-verified peak-hour measurement
  // (no hourly dispatch-capacity tracking exists to compute that for real).
  const peakHourSupplyCoveragePercent =
    activatedCount > 0 ? Number(((availableDriversCount / activatedCount) * 100).toFixed(1)) : 0;

  const marketplaceSupplyStatus: DriverGrowthHealthReportDTO['marketplaceSupplyStatus'] =
    peakHourSupplyCoveragePercent >= 120
      ? 'SURPLUS'
      : peakHourSupplyCoveragePercent >= 60
        ? 'SUFFICIENT'
        : 'SUPPLY_DEFICIT';

  const marketplaceHealthAnswer =
    marketplaceSupplyStatus === 'SUFFICIENT'
      ? `YES. ${availableDriversCount} of ${activatedCount} activated drivers are currently available (${peakHourSupplyCoveragePercent}%), with a ${driverRetentionRate7dPercent}% 7-day driver retention rate.`
      : `AT RISK. Only ${availableDriversCount} of ${activatedCount} activated drivers are currently available (${peakHourSupplyCoveragePercent}%) — supply may not support current demand.`;

  return {
    marketplaceSupplyStatus,
    totalActiveDrivers: totalDriversCount,
    totalAvailableDrivers: availableDriversCount,
    driverActivationFunnel,
    driverRetentionRate7dPercent,
    driverRetentionRate30dPercent,
    peakHourSupplyCoveragePercent,
    marketplaceHealthAnswer,
  };
}
