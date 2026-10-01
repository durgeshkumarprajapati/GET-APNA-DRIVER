export interface PremiumDriverTrustProfile {
  driverId: string;
  fullName: string;
  avatarUrl: string;
  rating: number;
  totalTripsCompleted: number;
  verificationBadges: string[];
  vehicle: {
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
  status: 'DRIVER_ASSIGNED' | 'DRIVER_EN_ROUTE' | 'DRIVER_ARRIVED' | 'TRIP_IN_PROGRESS' | 'TRIP_COMPLETED' | 'CANCELLED';
  statusLabel: string;
}

export interface PaymentRefundStatus {
  baseFare: number;
  distanceFare: number;
  durationFare: number;
  taxes: number;
  discountAmount: number;
  totalFare: number;
  paymentMethod: 'CASH' | 'UPI' | 'CREDIT_CARD' | 'WALLET' | 'CORPORATE_BILLING';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
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
