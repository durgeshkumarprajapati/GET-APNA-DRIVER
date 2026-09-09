import 'server-only';
import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { toDecimal, ZERO } from '@/modules/finance/domain/money';
import { getDriverRatingSummary, type RatingDistribution } from './rating-aggregate-service';

export interface DriverPerformanceMetrics {
  driverProfileId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: RatingDistribution;
  completedTrips: number;
  cancelledAssignedTrips: number;
  /** completedTrips / eligibleAssignedTrips, as a Decimal string (e.g. "0.9231"). */
  completionRate: string;
  /** cancelledAssignedTrips / eligibleAssignedTrips, as a Decimal string. */
  cancellationRate: string;
  /** Mean captured Payment.amount across the driver's completed trips, Decimal string. */
  averageTripValue: string;
  /** Lifetime earnings from DriverWallet.totalEarned, Decimal string. */
  totalEarnings: string;
}

/**
 * Reusable server-side performance metrics for a driver, backed entirely by
 * real data (Booking/Payment/DriverWallet/DriverRatingSummary) — no
 * fabricated statistics. Shared by the driver dashboard, admin driver
 * directory/detail, and the driver portfolio, so the formulas below are
 * defined exactly once.
 *
 * Eligible Assigned Trips = bookings actually assigned to this driver
 * (assignedAt IS NOT NULL) that reached a terminal, driver-attributable
 * outcome (TRIP_COMPLETED or CANCELLED). EXPIRED/DRAFT bookings never
 * reached assignment and are excluded from both the numerator and
 * denominator of completion/cancellation rate.
 */
export async function getDriverPerformanceMetrics(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverPerformanceMetrics> {
  const eligibleWhere: Prisma.BookingWhereInput = {
    driverProfileId,
    assignedAt: { not: null },
    status: { in: [BookingStatus.TRIP_COMPLETED, BookingStatus.CANCELLED] },
  };

  const [
    ratingSummary,
    completedTrips,
    cancelledAssignedTrips,
    eligibleAssignedTrips,
    wallet,
    tripValueAgg,
  ] = await Promise.all([
    getDriverRatingSummary(driverProfileId, db),
    db.booking.count({
      where: { driverProfileId, status: BookingStatus.TRIP_COMPLETED },
    }),
    db.booking.count({
      where: { ...eligibleWhere, status: BookingStatus.CANCELLED },
    }),
    db.booking.count({ where: eligibleWhere }),
    db.driverWallet.findUnique({ where: { driverProfileId } }),
    db.payment.aggregate({
      where: { driverProfileId, status: PaymentStatus.CAPTURED },
      _avg: { amount: true },
    }),
  ]);

  const completionRate =
    eligibleAssignedTrips > 0
      ? toDecimal(completedTrips).div(eligibleAssignedTrips).toDecimalPlaces(4)
      : ZERO;
  const cancellationRate =
    eligibleAssignedTrips > 0
      ? toDecimal(cancelledAssignedTrips).div(eligibleAssignedTrips).toDecimalPlaces(4)
      : ZERO;

  return {
    driverProfileId,
    averageRating: ratingSummary.averageRating,
    totalReviews: ratingSummary.totalReviews,
    ratingDistribution: ratingSummary.distribution,
    completedTrips,
    cancelledAssignedTrips,
    completionRate: completionRate.toString(),
    cancellationRate: cancellationRate.toString(),
    averageTripValue: (tripValueAgg._avg.amount ?? ZERO).toString(),
    totalEarnings: (wallet?.totalEarned ?? ZERO).toString(),
  };
}
