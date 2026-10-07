import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { DriverUX3ActiveWorkflowDTO } from '../../domain/driver-ux3-types';
import { calculateHaversineDistance } from '@/modules/location/application/distance-service';
import {
  getDriverShiftSummary,
  getDriverEarningsBreakdown,
  getDriverPerformanceInsights,
} from './driver-experience-insights-service';

/**
 * Phase 103 — Driver UX 3.0 Service
 * Focuses driver experience around a single clear question: "What do I need to do next?"
 * Returns active booking step, today's earnings snapshot, and 1-tap workflow state.
 *
 * Today's earnings/trips/acceptance-rate/rating are computed by the same
 * real services the Phase 91 driver insights widget uses — a prior version
 * duplicated this with hardcoded constants (todaysEarningsAmount: 1850,
 * acceptanceRatePercent: 96.0, rating: 4.9 as a fallback for a
 * profile.rating field that doesn't exist on DriverProfile) that never
 * reflected the actual driver.
 */
export async function getDriverUX3ActiveWorkflow(
  driverUserId: string,
  db: Db = prisma,
): Promise<DriverUX3ActiveWorkflowDTO> {
  const profile = await db.driverProfile.findUnique({
    where: { userId: driverUserId },
    include: { currentLocation: true },
  });

  const activeBooking = profile
    ? await db.booking.findFirst({
        where: {
          driverProfileId: profile.id,
          status: {
            in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_IN_PROGRESS'],
          },
        },
        include: {
          customer: {
            include: {
              customerProfile: { select: { displayName: true, firstName: true, lastName: true } },
              identities: { select: { phoneNumber: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    : null;

  const isOnline = profile?.availabilityStatus === 'AVAILABLE';

  let nextAction: DriverUX3ActiveWorkflowDTO['nextAction'] = {
    actionType: isOnline ? 'ACCEPT_OFFER' : 'GO_ONLINE',
    title: isOnline ? 'Waiting for Nearby Rides' : 'Go Online to Receive Rides',
    subtitle: isOnline
      ? 'You are currently visible to customers within 10km radius.'
      : 'Tap to start your shift and begin earning.',
  };

  if (activeBooking) {
    const status = activeBooking.status;
    const cp = activeBooking.customer?.customerProfile;
    const customerName =
      cp?.displayName || [cp?.firstName, cp?.lastName].filter(Boolean).join(' ') || 'Customer';
    const customerPhone =
      activeBooking.customer?.identities.find((i) => i.phoneNumber)?.phoneNumber || '';

    let etaMins: number | undefined;
    if (profile?.currentLocation) {
      const meters = calculateHaversineDistance(
        profile.currentLocation.latitude,
        profile.currentLocation.longitude,
        activeBooking.pickupLatitude,
        activeBooking.pickupLongitude,
      );
      etaMins = Math.max(3, Math.min(30, Math.round(meters / 500) + 4));
    }

    if (status === 'DRIVER_ASSIGNED' || status === 'DRIVER_EN_ROUTE') {
      nextAction = {
        actionType: 'START_NAVIGATION',
        title: 'Navigate to Customer Pickup',
        subtitle: `Pickup: ${activeBooking.pickupAddress}`,
        targetBookingId: activeBooking.id,
        pickupAddress: activeBooking.pickupAddress,
        customerName,
        customerPhone,
        etaMins,
      };
    } else if (status === 'DRIVER_ARRIVED') {
      nextAction = {
        actionType: 'START_TRIP',
        title: 'Start Trip with Customer',
        subtitle: 'Confirm OTP pin / verify customer present in vehicle.',
        targetBookingId: activeBooking.id,
        pickupAddress: activeBooking.pickupAddress,
        customerName,
      };
    } else if (status === 'TRIP_IN_PROGRESS') {
      nextAction = {
        actionType: 'COMPLETE_TRIP',
        title: 'Complete Trip & Collect Payment',
        subtitle: `Destination: ${activeBooking.dropoffAddress || 'Flexible Route'}`,
        targetBookingId: activeBooking.id,
        customerName,
      };
    }
  }

  let todaysBookingsCompleted = 0;
  let todaysEarningsAmount = 0;
  let todaysOnlineHours = 0;
  let acceptanceRatePercent = 0;
  let rating = 0;

  if (profile) {
    const [shiftSummary, earningsBreakdown, performanceInsights] = await Promise.all([
      getDriverShiftSummary(profile.id, new Date(), db),
      getDriverEarningsBreakdown(profile.id, new Date(), db),
      getDriverPerformanceInsights(profile.id, db),
    ]);

    todaysBookingsCompleted = earningsBreakdown.completedTripsToday;
    todaysEarningsAmount = Number(earningsBreakdown.todayNetEarnings);
    // Online-hours proxy: time on duty since the last status change, not a
    // real tracked shift-clock (none exists) — same proxy the Phase 91
    // shift summary already uses.
    todaysOnlineHours = Math.round((shiftSummary.activeShiftDurationMinutes / 60) * 10) / 10;
    acceptanceRatePercent = performanceInsights.acceptanceRatePercentage;
    rating = performanceInsights.averageRating;
  }

  return {
    driverId: driverUserId,
    isOnline,
    todaysBookingsCompleted,
    todaysEarningsAmount,
    todaysOnlineHours,
    acceptanceRatePercent,
    rating,
    nextAction,
    activeBookingSummary: activeBooking
      ? {
          bookingId: activeBooking.id,
          status: activeBooking.status,
          pickupAddress: activeBooking.pickupAddress,
          dropoffAddress: activeBooking.dropoffAddress || 'Flexible Route',
          fareAmount: Number(
            activeBooking.finalFareAmount || activeBooking.estimatedFareAmount || 0,
          ),
          customerNotes: activeBooking.customerNotes || undefined,
        }
      : undefined,
  };
}
