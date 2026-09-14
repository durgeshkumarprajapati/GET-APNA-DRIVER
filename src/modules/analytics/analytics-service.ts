import { prisma } from '@/shared/database/prisma';
import {
  BookingStatus,
  PaymentStatus,
  SafetyIncidentStatus,
  SupportTicketStatus,
  DriverApprovalStatus,
  DriverAvailabilityStatus,
} from '@prisma/client';

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
  rangeKey: 'today' | '7d' | '30d' | '90d' | 'custom';
}

export interface AnalyticsMetrics {
  dateRange: {
    start: string;
    end: string;
    rangeKey: string;
  };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
    active: number;
    completionRate: number;
    cancellationRate: number;
  };
  financial: {
    grossMerchandiseValue: number;
    netPlatformRevenue: number;
    driverPayouts: number;
    totalDiscounts: number;
    takeRate: number;
  };
  drivers: {
    total: number;
    approved: number;
    online: number;
    available: number;
  };
  customers: {
    total: number;
    registeredInRange: number;
  };
  dispatch: {
    totalAttempts: number;
    successfulAssignments: number;
    assignmentSuccessRate: number;
  };
  safety: {
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
  };
  support: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
  };
}

export function parseAnalyticsDateRange(
  rangeParam: string | null,
  startParam?: string | null,
  endParam?: string | null,
): AnalyticsDateRange {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;
  let rangeKey: 'today' | '7d' | '30d' | '90d' | 'custom' = '30d';

  if (rangeParam === 'today') {
    rangeKey = 'today';
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (rangeParam === '7d') {
    rangeKey = '7d';
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (rangeParam === '90d') {
    rangeKey = '90d';
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (rangeParam === 'custom' && startParam && endParam) {
    rangeKey = 'custom';
    const parsedStart = new Date(startParam);
    const parsedEnd = new Date(endParam);
    if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
      startDate = parsedStart;
      endDate = parsedEnd;
      // Cap maximum date range at 180 days to prevent unbounded queries
      const maxDiffMs = 180 * 24 * 60 * 60 * 1000;
      if (endDate.getTime() - startDate.getTime() > maxDiffMs) {
        startDate = new Date(endDate.getTime() - maxDiffMs);
      }
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  } else {
    // Default 30d
    rangeKey = '30d';
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate, rangeKey };
}

export async function getAdminAnalyticsMetrics(
  dateRange: AnalyticsDateRange,
): Promise<AnalyticsMetrics> {
  const { startDate, endDate, rangeKey } = dateRange;

  const dateFilter = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // 1. Booking metrics aggregation
  const [totalBookings, completedBookings, cancelledBookings, activeBookings] = await Promise.all([
    prisma.booking.count({ where: dateFilter }),
    prisma.booking.count({
      where: { ...dateFilter, status: BookingStatus.TRIP_COMPLETED },
    }),
    prisma.booking.count({
      where: { ...dateFilter, status: BookingStatus.CANCELLED },
    }),
    prisma.booking.count({
      where: {
        status: {
          in: [
            BookingStatus.SEARCHING_DRIVER,
            BookingStatus.DRIVER_ASSIGNED,
            BookingStatus.DRIVER_EN_ROUTE,
            BookingStatus.DRIVER_ARRIVED,
            BookingStatus.TRIP_IN_PROGRESS,
          ],
        },
      },
    }),
  ]);

  const completionRate = totalBookings > 0 ? Number(((completedBookings / totalBookings) * 100).toFixed(1)) : 0;
  const cancellationRate = totalBookings > 0 ? Number(((cancelledBookings / totalBookings) * 100).toFixed(1)) : 0;

  // 2. Financial metrics aggregation (from captured payments)
  const paymentAggregations = await prisma.payment.aggregate({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: PaymentStatus.CAPTURED,
    },
    _sum: {
      amount: true,
      commissionAmount: true,
      driverEarningsAmount: true,
      discountAmount: true,
    },
  });

  const grossMerchandiseValue = Number(paymentAggregations._sum.amount ?? 0);
  const netPlatformRevenue = Number(paymentAggregations._sum.commissionAmount ?? 0);
  const driverPayouts = Number(paymentAggregations._sum.driverEarningsAmount ?? 0);
  const totalDiscounts = Number(paymentAggregations._sum.discountAmount ?? 0);
  const takeRate = grossMerchandiseValue > 0 ? Number(((netPlatformRevenue / grossMerchandiseValue) * 100).toFixed(1)) : 0;

  // 3. Driver fleet status
  const [totalDrivers, approvedDrivers, onlineDrivers, availableDrivers] = await Promise.all([
    prisma.driverProfile.count(),
    prisma.driverProfile.count({ where: { approvalStatus: DriverApprovalStatus.APPROVED } }),
    prisma.driverProfile.count({
      where: { availabilityStatus: { in: [DriverAvailabilityStatus.AVAILABLE, DriverAvailabilityStatus.BUSY] } },
    }),
    prisma.driverProfile.count({ where: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE } }),
  ]);

  // 4. Customer metrics
  const [totalCustomers, registeredCustomersInRange] = await Promise.all([
    prisma.customerProfile.count(),
    prisma.customerProfile.count({ where: dateFilter }),
  ]);

  // 5. Dispatch attempts
  const [totalAttempts, acceptedAttempts] = await Promise.all([
    prisma.bookingAssignmentAttempt.count({ where: dateFilter }),
    prisma.bookingAssignmentAttempt.count({
      where: { ...dateFilter, status: 'ACCEPTED' },
    }),
  ]);
  const assignmentSuccessRate = totalAttempts > 0 ? Number(((acceptedAttempts / totalAttempts) * 100).toFixed(1)) : 0;

  // 6. Safety SOS incidents
  const [totalIncidents, openIncidents, resolvedIncidents] = await Promise.all([
    prisma.safetyIncident.count({ where: dateFilter }),
    prisma.safetyIncident.count({
      where: {
        status: {
          in: [
            SafetyIncidentStatus.OPEN,
            SafetyIncidentStatus.ACKNOWLEDGED,
            SafetyIncidentStatus.INVESTIGATING,
            SafetyIncidentStatus.ESCALATED,
          ],
        },
      },
    }),
    prisma.safetyIncident.count({ where: { ...dateFilter, status: SafetyIncidentStatus.RESOLVED } }),
  ]);

  // 7. Support tickets
  const [totalTickets, openTickets, resolvedTickets] = await Promise.all([
    prisma.supportTicket.count({ where: dateFilter }),
    prisma.supportTicket.count({
      where: {
        status: {
          in: [
            SupportTicketStatus.OPEN,
            SupportTicketStatus.IN_PROGRESS,
            SupportTicketStatus.WAITING_FOR_CUSTOMER,
            SupportTicketStatus.REOPENED,
          ],
        },
      },
    }),
    prisma.supportTicket.count({
      where: { ...dateFilter, status: { in: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED] } },
    }),
  ]);

  return {
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      rangeKey,
    },
    bookings: {
      total: totalBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      active: activeBookings,
      completionRate,
      cancellationRate,
    },
    financial: {
      grossMerchandiseValue,
      netPlatformRevenue,
      driverPayouts,
      totalDiscounts,
      takeRate,
    },
    drivers: {
      total: totalDrivers,
      approved: approvedDrivers,
      online: onlineDrivers,
      available: availableDrivers,
    },
    customers: {
      total: totalCustomers,
      registeredInRange: registeredCustomersInRange,
    },
    dispatch: {
      totalAttempts,
      successfulAssignments: acceptedAttempts,
      assignmentSuccessRate,
    },
    safety: {
      totalIncidents,
      openIncidents,
      resolvedIncidents,
    },
    support: {
      totalTickets,
      openTickets,
      resolvedTickets,
    },
  };
}
