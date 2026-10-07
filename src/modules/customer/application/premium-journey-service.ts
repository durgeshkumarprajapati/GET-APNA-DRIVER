import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';
import { getCustomerBookingLocationTelemetry } from '@/modules/location/application/booking-location-service';
import { calculateHaversineDistance } from '@/modules/location/application/distance-service';
import { createReview } from '@/modules/review/application/review-service';
import { createSupportTicket } from '@/modules/support/application/services/customer-support-service';
import type { SupportTicketCategory } from '@prisma/client';
import {
  PremiumJourneyTrustDTO,
  PostServiceFeedbackInput,
  FeedbackResolutionResult,
} from '../domain/premium-journey-types';

interface FareBreakdownSnapshot {
  baseFareAmount?: string;
  distanceFareAmount?: string;
  durationFareAmount?: string;
  platformFeeAmount?: string;
  totalFareAmount?: string;
}

function readPricingSnapshot(pricingSnapshot: unknown): FareBreakdownSnapshot {
  if (!pricingSnapshot || typeof pricingSnapshot !== 'object') return {};
  const breakdown = (pricingSnapshot as Record<string, unknown>).breakdown;
  if (!breakdown || typeof breakdown !== 'object') return {};
  return breakdown as FareBreakdownSnapshot;
}

function mapPaymentStatus(
  status: string | undefined,
): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' {
  switch (status) {
    case 'CAPTURED':
      return 'PAID';
    case 'FAILED':
    case 'CANCELLED':
      return 'FAILED';
    case 'REFUNDED':
      return 'REFUNDED';
    case 'PARTIALLY_REFUNDED':
      return 'PARTIALLY_REFUNDED';
    default:
      return 'PENDING';
  }
}

/**
 * Retrieves comprehensive live journey visualization, driver verification trust profile,
 * and transparent payment/refund details.
 */
export async function getPremiumJourneyTrustDetails(
  bookingId: string,
  customerId: string,
  db: Db = prisma,
): Promise<PremiumJourneyTrustDTO> {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, customerId },
    include: {
      driverProfile: {
        include: { ratingSummary: true },
      },
      payments: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  const driverProfile = booking.driverProfile;

  // Real-time telemetry (the same source the live-tracking page uses) for
  // both the driver's name/avatar and the actual current location — not
  // fabricated coordinates.
  const telemetry = driverProfile
    ? await getCustomerBookingLocationTelemetry(customerId, bookingId, db).catch(() => null)
    : null;

  let totalTripsCompleted = 0;
  if (driverProfile) {
    totalTripsCompleted = await db.booking.count({
      where: { driverProfileId: driverProfile.id, status: 'TRIP_COMPLETED' },
    });
  }

  const driverTrustProfile = driverProfile
    ? {
        driverId: driverProfile.id,
        fullName:
          driverProfile.displayName ||
          [driverProfile.firstName, driverProfile.lastName].filter(Boolean).join(' ') ||
          'Assigned Driver',
        avatarUrl: driverProfile.profileImageUrl || null,
        rating: driverProfile.ratingSummary ? Number(driverProfile.ratingSummary.averageRating) : 0,
        totalTripsCompleted,
        // Only ever claims what the real onboarding/verification pipeline
        // actually recorded — never a fixed list implying every driver is
        // background- and police-cleared regardless of their real status.
        verificationBadges: [
          ...(driverProfile.verificationStatus === 'VERIFIED' ? ['Documents Verified'] : []),
          ...(driverProfile.approvalStatus === 'APPROVED' ? ['Approved Partner'] : []),
        ],
        // No vehicle make/model/color/plate anywhere in the schema (only
        // an abstract VehicleCategory requirement) — omitted rather than
        // fabricated. See premium-journey-types.ts.
      }
    : undefined;

  const status = booking.status;
  let statusLabel = 'Driver is on the way';
  if (status === 'DRIVER_ARRIVED') statusLabel = 'Driver has arrived at pickup';
  else if (status === 'TRIP_IN_PROGRESS') statusLabel = 'Trip in progress';
  else if (status === 'TRIP_COMPLETED') statusLabel = 'Trip completed';
  else if (status === 'CANCELLED') statusLabel = 'Booking cancelled';
  const isCancelled = status === 'CANCELLED';

  const driverLocation = telemetry?.driverLocation ?? null;
  const targetLocation =
    status === 'TRIP_IN_PROGRESS'
      ? { latitude: booking.dropoffLatitude, longitude: booking.dropoffLongitude }
      : { latitude: booking.pickupLatitude, longitude: booking.pickupLongitude };

  let remainingDistanceKm = 0;
  let estimatedArrivalMins = 0;
  if (
    !isCancelled &&
    driverLocation &&
    targetLocation.latitude != null &&
    targetLocation.longitude != null
  ) {
    const meters = calculateHaversineDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      targetLocation.latitude,
      targetLocation.longitude,
    );
    remainingDistanceKm = Math.round((meters / 1000) * 10) / 10;
    const speedKmh = driverLocation.speed ? driverLocation.speed * 3.6 : 20; // m/s -> km/h, 20km/h fallback
    estimatedArrivalMins =
      speedKmh > 0 ? Math.max(1, Math.round((remainingDistanceKm / speedKmh) * 60)) : 0;
  }

  const breakdown = readPricingSnapshot(booking.pricingSnapshot);
  const baseFare = Number(breakdown.baseFareAmount ?? 0);
  const distanceFare = Number(breakdown.distanceFareAmount ?? 0);
  const durationFare = Number(breakdown.durationFareAmount ?? 0);
  const taxes = Number(breakdown.platformFeeAmount ?? 0);
  const discountAmount = Number(booking.discountAmount ?? 0);
  const totalFare = Number(
    booking.finalFareAmount ?? booking.estimatedFareAmount ?? breakdown.totalFareAmount ?? 0,
  );

  const paymentRecord = booking.payments?.[0];

  return {
    bookingId: booking.id,
    driverTrustProfile,
    liveJourney: {
      currentLatitude: driverLocation?.latitude ?? booking.pickupLatitude,
      currentLongitude: driverLocation?.longitude ?? booking.pickupLongitude,
      speedKmh: driverLocation?.speed ? Math.round(driverLocation.speed * 3.6) : 0,
      estimatedArrivalMins: isCancelled ? 0 : estimatedArrivalMins,
      remainingDistanceKm: isCancelled ? 0 : remainingDistanceKm,
      progressPercent: status === 'TRIP_COMPLETED' ? 100 : status === 'TRIP_IN_PROGRESS' ? 65 : 25,
      status: isCancelled ? 'CANCELLED' : status,
      statusLabel,
    },
    paymentRefund: {
      baseFare,
      distanceFare,
      durationFare,
      taxes,
      discountAmount,
      totalFare,
      paymentMethod: paymentRecord?.paymentMethod ?? null,
      paymentStatus: isCancelled ? 'REFUNDED' : mapPaymentStatus(paymentRecord?.status),
      refundStatus: isCancelled ? 'COMPLETED' : 'NOT_APPLICABLE',
      refundableAmount: isCancelled ? totalFare : 0,
    },
    sosEmergencyActive: false,
    emergencyContactPhone: '+919999900000',
    supportHelplineNumber: '1800-APNA-DRIVER',
  };
}

function mapIssueCategoryToSupportCategory(
  issueCategory: NonNullable<PostServiceFeedbackInput['issueCategory']>,
): SupportTicketCategory {
  switch (issueCategory) {
    case 'OVERCHARGED':
      return 'PAYMENT_FARE';
    case 'UNSAFE_DRIVING':
      return 'SAFETY_CONCERN';
    case 'DRIVER_NO_SHOW':
    case 'CLEANLINESS_ISSUE':
      return 'DRIVER_CONDUCT';
    default:
      return 'OTHER';
  }
}

/**
 * Submits post-service feedback as a real Review, and opens a real
 * SupportTicket when an issue category is selected — both re-validate
 * booking ownership against the database themselves (createReview requires
 * TRIP_COMPLETED + ownership; createSupportTicket requires ownership when a
 * bookingId is given).
 */
export async function submitPostServiceFeedback(
  bookingId: string,
  customerId: string,
  input: PostServiceFeedbackInput,
  db: Db = prisma,
): Promise<FeedbackResolutionResult> {
  const review = await createReview(
    {
      bookingId,
      customerUserId: customerId,
      rating: input.rating,
      comment: input.issueDetails ?? null,
    },
    db,
  );

  let ticketId: string | undefined;
  let issueTicketCreated = false;
  let resolutionSummary = `Feedback recorded with rating ${input.rating}/5.`;

  if (input.issueCategory) {
    const ticket = await createSupportTicket(
      {
        customerId,
        bookingId,
        category: mapIssueCategoryToSupportCategory(input.issueCategory),
        subject: `Post-trip issue: ${input.issueCategory.replace(/_/g, ' ').toLowerCase()}`,
        description:
          input.issueDetails || `Customer reported ${input.issueCategory} after trip completion.`,
      },
      db,
    );
    issueTicketCreated = true;
    ticketId = ticket.ticketNumber;
    resolutionSummary = `Rating recorded. Support ticket ${ticketId} created for issue: ${input.issueCategory}. Our support team will respond soon.`;
  } else if (input.tipAmount && input.tipAmount > 0) {
    // Driver tipping isn't implemented yet anywhere in this platform (no
    // payment capture or wallet-credit path exists for it) — the rating is
    // still recorded for real above, but a tip amount must never be
    // reported as successfully added when nothing was actually charged or
    // credited.
    resolutionSummary += ' Driver tipping is not yet available — your rating has been recorded.';
  }

  return {
    feedbackId: review.id,
    ratingRecorded: input.rating,
    tipProcessedAmount: 0,
    issueTicketCreated,
    ticketId,
    resolutionSummary,
    status: issueTicketCreated ? 'ESCALATED' : 'RECORDED',
  };
}
