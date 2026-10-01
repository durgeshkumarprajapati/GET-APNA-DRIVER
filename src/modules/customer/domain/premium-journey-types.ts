import type { BookingStatus } from '@prisma/client';

export interface PremiumDriverTrustProfile {
  driverId: string;
  fullName: string;
  avatarUrl: string | null;
  rating: number;
  totalTripsCompleted: number;
  verificationBadges: string[];
  /**
   * Omitted rather than fabricated: nothing in the schema stores a
   * driver's actual vehicle make/model/color/plate (only an abstract
   * VehicleCategory requirement like "SUV"), so there's no real value to
   * put here. A future phase that adds real per-vehicle records should
   * populate this; until then, showing a made-up plate number would be
   * actively misleading for a feature whose purpose is pickup safety
   * verification.
   */
  vehicle?: {
    make: string;
    model: string;
    color: string;
    licensePlate: string;
  };
}

export interface LiveJourneyVisualization {
  currentLatitude: number;
  currentLongitude: number;
  speedKmh: number;
  estimatedArrivalMins: number;
  remainingDistanceKm: number;
  progressPercent: number;
  status: BookingStatus;
  statusLabel: string;
}

export interface PaymentRefundStatus {
  baseFare: number;
  distanceFare: number;
  durationFare: number;
  taxes: number;
  discountAmount: number;
  totalFare: number;
  paymentMethod: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  refundStatus: 'NOT_APPLICABLE' | 'ELIGIBLE' | 'PROCESSING' | 'COMPLETED';
  refundableAmount: number;
}

export interface PremiumJourneyTrustDTO {
  bookingId: string;
  driverTrustProfile?: PremiumDriverTrustProfile;
  liveJourney: LiveJourneyVisualization;
  paymentRefund: PaymentRefundStatus;
  sosEmergencyActive: boolean;
  emergencyContactPhone: string;
  supportHelplineNumber: string;
}

export interface PostServiceFeedbackInput {
  rating: number;
  tipAmount?: number;
  feedbackTags?: string[];
  issueCategory?: 'OVERCHARGED' | 'UNSAFE_DRIVING' | 'DRIVER_NO_SHOW' | 'CLEANLINESS_ISSUE' | 'OTHER';
  issueDetails?: string;
}

export interface FeedbackResolutionResult {
  feedbackId: string;
  ratingRecorded: number;
  tipProcessedAmount: number;
  issueTicketCreated: boolean;
  ticketId?: string;
  resolutionSummary: string;
  status: 'RECORDED' | 'ESCALATED';
}
