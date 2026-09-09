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
import { toDecimal, ZERO } from '@/modules/finance/domain/money';

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
