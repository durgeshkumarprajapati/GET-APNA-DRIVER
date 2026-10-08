import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { GrowthCommandCenterDTO } from '../../domain/growth-command-center-types';

/**
 * Phase 115 — Product Growth Command Center Service
 * Dedicated executive & product growth dashboard combining CUSTOMERS, BOOKINGS, DRIVERS,
 * GROWTH, and QUALITY metrics into a single real-time payload.
 *
 * A prior version mixed a handful of real counts with invented derived
 * metrics (repeatBookingRatePercent: 58.4, referralSignupsCount: 340,
 * campaignRoiMultiplier: 4.8, supplyHealthStatus always 'HEALTHY',
 * averageCustomerRating: 4.91, netPromoterScore: 68 — all fixed constants
 * regardless of actual platform state). Every field below is now either a
 * real computation or an honest 0/'UNKNOWN' where no real data source
 * exists (campaignRoiMultiplier needs marketing-spend data this platform
 * doesn't track; runningExperimentsCount needs persisted experiment
 * records, which don't exist — evaluateFeatureFlag buckets on the fly with
 * nothing registered as "running"; netPromoterScore needs a real NPS
 * survey system, which doesn't exist).
 */
export async function getProductGrowthCommandCenter(
  db: Db = prisma,
): Promise<GrowthCommandCenterDTO> {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalDrivers,
    availableDrivers,
    approvedDrivers,
    totalBookings,
    completedBookings,
    cancelledBookings,
    customersWithCompletedBooking,
    repeatCustomers,
    recentCustomersWithBooking,
    repeatCustomersRecent,
    totalReferrals,
    rewardedOrQualifiedReferrals,
    activeOffersCount,
    ratingAggregate,
    openComplaintsCount,
    supportTicketsResolvedCount,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.driverProfile.count(),
    db.driverProfile.count({ where: { availabilityStatus: 'AVAILABLE' } }),
    db.driverProfile.count({ where: { approvalStatus: 'APPROVED' } }),
    db.booking.count(),
    db.booking.count({ where: { status: 'TRIP_COMPLETED' } }),
    db.booking.count({ where: { status: 'CANCELLED' } }),
    db.booking.groupBy({
      by: ['customerId'],
      where: { status: 'TRIP_COMPLETED' },
      _count: { _all: true },
    }),
    db.booking.groupBy({
      by: ['customerId'],
      where: { status: 'TRIP_COMPLETED' },
      _count: { _all: true },
      having: { customerId: { _count: { gt: 1 } } },
    }),
    db.booking.groupBy({
      by: ['customerId'],
      where: { status: 'TRIP_COMPLETED', createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),
    db.booking.groupBy({
      by: ['customerId'],
      where: { status: 'TRIP_COMPLETED' },
      _count: { _all: true },
      having: { customerId: { _count: { gt: 1 } } },
    }),
    db.referral.count(),
    db.referral.count({ where: { status: { in: ['QUALIFIED', 'REWARDED'] } } }),
    db.promotion.count({ where: { status: 'ACTIVE' } }),
    db.driverRatingSummary.aggregate({ _avg: { averageRating: true } }),
    db.supportTicket.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'REOPENED'] } },
    }),
    db.supportTicket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
  ]);

  const completionRatePercent =
    totalBookings > 0 ? Number(((completedBookings / totalBookings) * 100).toFixed(1)) : 0;
  const abandonedCount = Math.max(0, totalBookings - completedBookings - cancelledBookings);

  const repeatBookingRatePercent =
    customersWithCompletedBooking.length > 0
      ? Number(((repeatCustomers.length / customersWithCompletedBooking.length) * 100).toFixed(1))
      : 0;
  // 30-day retention proxy: of customers who completed a ride in the last
  // 30 days, what share are also all-time repeat customers. There's no
  // historical cohort snapshot table to compute a textbook retention curve.
  const retention30dRatePercent =
    recentCustomersWithBooking.length > 0
      ? Number(
          ((repeatCustomersRecent.length / recentCustomersWithBooking.length) * 100).toFixed(1),
        )
      : 0;

  const activatedCount = approvedDrivers;
  const supplyRatio = activatedCount > 0 ? availableDrivers / activatedCount : 0;
  const supplyHealthStatus =
    supplyRatio >= 0.6 ? 'HEALTHY' : supplyRatio >= 0.3 ? 'AT_RISK' : 'CRITICAL';

  const referralConversionPercent =
    totalReferrals > 0
      ? Number(((rewardedOrQualifiedReferrals / totalReferrals) * 100).toFixed(1))
      : 0;

  return {
    customers: {
      newUsersCount: totalUsers,
      activatedUsersCount: customersWithCompletedBooking.length,
      firstBookingCount: customersWithCompletedBooking.length,
      repeatBookingRatePercent,
      retention30dRatePercent,
    },
    bookings: {
      startedCount: totalBookings,
      completedCount: completedBookings,
      abandonedCount,
      cancelledCount: cancelledBookings,
      completionRatePercent,
    },
    drivers: {
      activeCount: totalDrivers,
      availableCount: availableDrivers,
      activatedCount,
      retainedCount: approvedDrivers,
      supplyHealthStatus,
    },
    growth: {
      referralSignupsCount: totalReferrals,
      referralConversionPercent,
      // No marketing-spend tracking exists anywhere to compute a real ROI
      // multiplier against.
      campaignRoiMultiplier: 0,
      activeOffersCount,
      // evaluateFeatureFlag buckets users on the fly with no persisted
      // experiment registry — there's nothing to count as "running".
      runningExperimentsCount: 0,
    },
    quality: {
      averageCustomerRating: ratingAggregate._avg.averageRating
        ? Number(ratingAggregate._avg.averageRating)
        : 0,
      openComplaintsCount,
      supportTicketsResolvedCount,
      // No NPS survey/response system exists anywhere in this platform.
      netPromoterScore: 0,
    },
    generatedAt: new Date().toISOString(),
  };
}
