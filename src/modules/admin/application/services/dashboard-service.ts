import 'server-only';
import {
  BookingStatus,
  DriverApprovalStatus,
  DriverAvailabilityStatus,
  DriverDocumentStatus,
  PaymentStatus,
  SettlementStatus,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { redis } from '@/shared/redis/client';
import { logger } from '@/shared/logging/logger';
import { toDecimal, ZERO } from '@/modules/finance/domain/money';

/**
 * Cache key: `admin:dashboard:metrics` (single global key — this is
 * account-wide operational data, not per-user).
 * TTL: 20s — short enough that the dashboard never shows meaningfully
 *   stale counts, long enough to absorb repeated polling from an open
 *   dashboard tab without re-running 9 aggregate queries on every refresh.
 * Invalidation trigger: none explicit — this is inherently eventually-
 *   consistent "as of a few seconds ago" operational data, same category
 *   as the existing driver-location cache; a time-based expiry is the
 *   correct and sufficient strategy (not a financial-ledger balance).
 * Fallback behavior: any Redis error on read or write is caught and
 *   treated as a cache miss/no-op — always falls through to computing the
 *   real metrics fresh, never blocks or serves an error.
 */
const DASHBOARD_CACHE_KEY = 'admin:dashboard:metrics';
const DASHBOARD_CACHE_TTL_SECONDS = 20;

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.SEARCHING_DRIVER,
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.TRIP_IN_PROGRESS,
];

export interface AdminDashboardMetrics {
  bookings: {
    active: number;
    completedToday: number;
    cancelledToday: number;
  };
  drivers: {
    totalApproved: number;
    onlineNow: number;
    pendingApplications: number;
    pendingDocumentVerifications: number;
  };
  finance: {
    capturedTodayAmount: string;
    capturedTodayCount: number;
    commissionTodayAmount: string;
    pendingSettlementsAmount: string;
    pendingSettlementsCount: number;
  };
  generatedAt: string;
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function getAdminDashboardMetrics(db: Db = prisma): Promise<AdminDashboardMetrics> {
  try {
    const cached = await redis.get(DASHBOARD_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as AdminDashboardMetrics;
    }
  } catch (err) {
    logger.warn({ err }, 'Dashboard metrics cache read failed; computing fresh');
  }

  const metrics = await computeAdminDashboardMetrics(db);

  try {
    await redis.set(
      DASHBOARD_CACHE_KEY,
      JSON.stringify(metrics),
      'EX',
      DASHBOARD_CACHE_TTL_SECONDS,
    );
  } catch (err) {
    logger.warn({ err }, 'Dashboard metrics cache write failed; continuing without cache');
  }

  return metrics;
}

async function computeAdminDashboardMetrics(db: Db): Promise<AdminDashboardMetrics> {
  const todayStart = startOfTodayUtc();

  const [
    activeBookings,
    completedToday,
    cancelledToday,
    totalApprovedDrivers,
    onlineDrivers,
    pendingApplications,
    pendingDocumentVerifications,
    capturedTodayAggregate,
    pendingSettlementsAggregate,
  ] = await Promise.all([
    db.booking.count({ where: { status: { in: ACTIVE_BOOKING_STATUSES } } }),
    db.booking.count({
      where: { status: BookingStatus.TRIP_COMPLETED, tripCompletedAt: { gte: todayStart } },
    }),
    db.booking.count({
      where: { status: BookingStatus.CANCELLED, cancelledAt: { gte: todayStart } },
    }),
    db.driverProfile.count({ where: { approvalStatus: DriverApprovalStatus.APPROVED } }),
    db.driverProfile.count({
      where: {
        availabilityStatus: {
          in: [DriverAvailabilityStatus.AVAILABLE, DriverAvailabilityStatus.BUSY],
        },
      },
    }),
    db.driverProfile.count({ where: { approvalStatus: DriverApprovalStatus.PENDING } }),
    db.driverDocument.count({ where: { status: DriverDocumentStatus.PENDING_VERIFICATION } }),
    db.payment.aggregate({
      where: { status: PaymentStatus.CAPTURED, capturedAt: { gte: todayStart } },
      _sum: { amount: true, commissionAmount: true },
      _count: true,
    }),
    db.driverSettlement.aggregate({
      where: { status: SettlementStatus.PENDING },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    bookings: {
      active: activeBookings,
      completedToday,
      cancelledToday,
    },
    drivers: {
      totalApproved: totalApprovedDrivers,
      onlineNow: onlineDrivers,
      pendingApplications,
      pendingDocumentVerifications,
    },
    finance: {
      capturedTodayAmount: toDecimal(capturedTodayAggregate._sum.amount ?? ZERO).toFixed(4),
      capturedTodayCount: capturedTodayAggregate._count,
      commissionTodayAmount: toDecimal(
        capturedTodayAggregate._sum.commissionAmount ?? ZERO,
      ).toFixed(4),
      pendingSettlementsAmount: toDecimal(pendingSettlementsAggregate._sum.amount ?? ZERO).toFixed(
        4,
      ),
      pendingSettlementsCount: pendingSettlementsAggregate._count,
    },
    generatedAt: new Date().toISOString(),
  };
}
