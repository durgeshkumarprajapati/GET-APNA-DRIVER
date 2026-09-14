import 'server-only';
import { BookingStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getDriverWalletSummary } from '@/modules/finance/application/services/wallet-service';
import type { DriverEarningsSummary } from '../../domain/types';

function getStartOfDay(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function getDriverEarningsSummary(
  driverProfileId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<DriverEarningsSummary> {
  const startOfDay = getStartOfDay(now);
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 7);
  periodStart.setHours(0, 0, 0, 0);

  const [todayAgg, todayCount, periodAgg, periodCount, walletSummary] = await Promise.all([
    db.booking.aggregate({
      where: {
        driverProfileId,
        status: BookingStatus.TRIP_COMPLETED,
        tripCompletedAt: { gte: startOfDay },
      },
      _sum: { finalFareAmount: true },
    }),
    db.booking.count({
      where: {
        driverProfileId,
        status: BookingStatus.TRIP_COMPLETED,
        tripCompletedAt: { gte: startOfDay },
      },
    }),
    db.booking.aggregate({
      where: {
        driverProfileId,
        status: BookingStatus.TRIP_COMPLETED,
        tripCompletedAt: { gte: periodStart },
      },
      _sum: { finalFareAmount: true },
    }),
    db.booking.count({
      where: {
        driverProfileId,
        status: BookingStatus.TRIP_COMPLETED,
        tripCompletedAt: { gte: periodStart },
      },
    }),
    getDriverWalletSummary(driverProfileId, db),
  ]);

  const todayEarningsVal = Number(todayAgg._sum.finalFareAmount ?? 0);
  const periodEarningsVal = Number(periodAgg._sum.finalFareAmount ?? 0);
  const avgFareVal = todayCount > 0 ? todayEarningsVal / todayCount : 0;

  return {
    driverProfileId,
    todayEarnings: todayEarningsVal.toFixed(2),
    completedTripsToday: todayCount,
    averageFarePerTrip: avgFareVal.toFixed(2),
    periodEarnings: periodEarningsVal.toFixed(2),
    periodTrips: periodCount,
    availableBalance: walletSummary.availableBalance,
    pendingBalance: walletSummary.pendingBalance,
    totalEarned: walletSummary.totalEarned,
    currency: walletSummary.currency,
  };
}
