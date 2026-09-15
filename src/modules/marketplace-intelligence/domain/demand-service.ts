import 'server-only';
import { prisma } from '@/shared/database/prisma';
import { BookingStatus, ScheduledRideStatus } from '@prisma/client';
import { resolveZoneForLocation, listMarketplaceZones } from './zone-service';

export interface DemandWindowQuery {
  startDate: Date;
  endDate: Date;
  zoneId?: string;
  vehicleCategory?: string;
}

export interface DemandMetricsSummary {
  timeWindow: {
    start: string;
    end: string;
    durationMinutes: number;
  };
  totalRequests: number;
  completedRides: number;
  cancelledRides: number;
  customerCancellations: number;
  driverCancellations: number;
  operatorCancellations: number;
  dispatchAttempts: number;
  successfulAssignments: number;
  failedDispatches: number;
  scheduledDemandCount: number;
  corporateDemandCount: number;
  organicDemandCount: number;
  historicalBaselineRequests: number;
  observedDemandTrendPercent: number;
  vehicleCategoryBreakdown: Record<string, number>;
  zoneBreakdown: Array<{
    zoneId: string;
    zoneName: string;
    zoneCode: string;
    requests: number;
    completed: number;
    cancelled: number;
  }>;
}

/**
 * Computes demand metrics aggregated across time, zone, and vehicle categories.
 * All metrics are calculated from actual stored database records.
 */
export async function getDemandMetrics(query: DemandWindowQuery): Promise<DemandMetricsSummary> {
  const { startDate, endDate, zoneId, vehicleCategory } = query;

  const durationMinutes = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (60 * 1000)),
  );

  const whereClause: Record<string, unknown> = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (vehicleCategory) {
    whereClause.vehicleCategory = vehicleCategory;
  }

  const [
    allBookings,
    assignmentAttempts,
    scheduledRides,
    activeZones,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        cancelledBy: true,
        vehicleCategory: true,
        pickupLatitude: true,
        pickupLongitude: true,
        scheduledRideId: true,
        organizationId: true,
        createdAt: true,
      },
    }),
    prisma.bookingAssignmentAttempt.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    prisma.scheduledRide.count({
      where: {
        status: ScheduledRideStatus.ACTIVE,
        nextOccurrenceAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    listMarketplaceZones(),
  ]);

  // Filter bookings by zone if specified
  const filteredBookings: Array<(typeof allBookings)[0] & { resolvedZoneId: string }> = [];

  for (const booking of allBookings) {
    const zone = await resolveZoneForLocation(booking.pickupLatitude, booking.pickupLongitude);
    if (!zoneId || zone.id === zoneId) {
      filteredBookings.push({
        ...booking,
        resolvedZoneId: zone.id,
      });
    }
  }

  const totalRequests = filteredBookings.length;
  let completedRides = 0;
  let cancelledRides = 0;
  let customerCancellations = 0;
  let driverCancellations = 0;
  let operatorCancellations = 0;
  let failedDispatches = 0;
  let corporateDemandCount = 0;
  let scheduledDemandCount = 0;
  let organicDemandCount = 0;

  const categoryMap: Record<string, number> = {};
  const zoneMap: Record<string, { requests: number; completed: number; cancelled: number }> = {};

  // Initialize active zones in map
  for (const z of activeZones) {
    zoneMap[z.id] = { requests: 0, completed: 0, cancelled: 0 };
  }
  zoneMap['unzoned'] = { requests: 0, completed: 0, cancelled: 0 };

  for (const b of filteredBookings) {
    // Category tally
    categoryMap[b.vehicleCategory] = (categoryMap[b.vehicleCategory] || 0) + 1;

    // Zone tally
    const zEntry = zoneMap[b.resolvedZoneId] || { requests: 0, completed: 0, cancelled: 0 };
    zEntry.requests += 1;

    if (b.status === BookingStatus.TRIP_COMPLETED) {
      completedRides += 1;
      zEntry.completed += 1;
    } else if (b.status === BookingStatus.CANCELLED) {
      cancelledRides += 1;
      zEntry.cancelled += 1;
      if (b.cancelledBy === 'CUSTOMER') customerCancellations += 1;
      else if (b.cancelledBy === 'DRIVER') driverCancellations += 1;
      else operatorCancellations += 1;
    } else if (b.status === BookingStatus.EXPIRED) {
      failedDispatches += 1;
    }

    if (b.organizationId) {
      corporateDemandCount += 1;
    }
    if (b.scheduledRideId) {
      scheduledDemandCount += 1;
    } else {
      organicDemandCount += 1;
    }

    zoneMap[b.resolvedZoneId] = zEntry;
  }

  // Include standalone upcoming scheduled rides into scheduled demand if querying future/current window
  scheduledDemandCount += scheduledRides;

  // Calculate historical baseline for comparable duration in prior 4-week same weekday windows
  const historicalBaselineRequests = await calculateHistoricalBaselineDemand(
    startDate,
    endDate,
    zoneId,
    vehicleCategory,
  );

  const observedDemandTrendPercent =
    historicalBaselineRequests > 0
      ? Number(
          (
            ((totalRequests - historicalBaselineRequests) / historicalBaselineRequests) *
            100
          ).toFixed(1),
        )
      : 0;

  const zoneBreakdown = Object.entries(zoneMap)
    .map(([zId, data]) => {
      const matchZone = activeZones.find((z) => z.id === zId);
      return {
        zoneId: zId,
        zoneName: matchZone ? matchZone.name : 'Unzoned Area',
        zoneCode: matchZone ? matchZone.code : 'UNZONED',
        ...data,
      };
    })
    .filter((z) => !zoneId || z.zoneId === zoneId || z.requests > 0);

  return {
    timeWindow: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      durationMinutes,
    },
    totalRequests,
    completedRides,
    cancelledRides,
    customerCancellations,
    driverCancellations,
    operatorCancellations,
    dispatchAttempts: assignmentAttempts,
    successfulAssignments: completedRides + (totalRequests - cancelledRides - failedDispatches),
    failedDispatches,
    scheduledDemandCount,
    corporateDemandCount,
    organicDemandCount,
    historicalBaselineRequests,
    observedDemandTrendPercent,
    vehicleCategoryBreakdown: categoryMap,
    zoneBreakdown,
  };
}

/**
 * Calculates historical baseline demand by looking back across up to 4 recent weeks at the same day-of-week & time bucket.
 */
async function calculateHistoricalBaselineDemand(
  startDate: Date,
  endDate: Date,
  _zoneId?: string,
  vehicleCategory?: string,
): Promise<number> {
  const windowDurationMs = endDate.getTime() - startDate.getTime();
  const sampleCounts: number[] = [];

  for (let weekOffset = 1; weekOffset <= 4; weekOffset++) {
    const historicalStart = new Date(startDate.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000);
    const historicalEnd = new Date(historicalStart.getTime() + windowDurationMs);

    const count = await prisma.booking.count({
      where: {
        createdAt: {
          gte: historicalStart,
          lte: historicalEnd,
        },
        ...(vehicleCategory ? { vehicleCategory } : {}),
      },
    });

    sampleCounts.push(count);
  }

  if (sampleCounts.length === 0) return 0;
  const avg = sampleCounts.reduce((a, b) => a + b, 0) / sampleCounts.length;
  return Math.round(avg);
}
