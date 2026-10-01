export type ConciergeIntent =
  | 'BOOKING_REQUEST'
  | 'SERVICE_QUERY'
  | 'PRICING_QUERY'
  | 'RECOMMENDATION'
  | 'BOOKING_CONFIRMATION';

export interface ConciergeRecipientDetails {
  fullName: string;
  phone: string;
  relationship?: string;
}

export interface ParsedBookingDraft {
  draftId: string;
  serviceType: 'ONE_WAY' | 'ROUND_TRIP' | 'HOURLY' | 'FULL_DAY';
  pickupAddress: string;
  dropoffAddress?: string;
  scheduledTime: string;
  recipient?: ConciergeRecipientDetails;
  vehicleCategory: 'HATCHBACK' | 'SEDAN' | 'SUV' | 'LUXURY';
  estimatedDistanceKm: number;
  estimatedFare: number;
  currency: string;
  recommendationReason: string;
  isConfirmed: boolean;
}

export interface ConciergeRecommendation {
  vehicleCategory: string;
  title: string;
  reason: string;
  estimatedFare: number;
}

export interface ConciergeProcessInput {
  message: string;
  locale?: string;
  draftIdToConfirm?: string;
}

export interface ConciergeProcessResult {
  replyText: string;
  intent: ConciergeIntent;
  bookingDraft?: ParsedBookingDraft;
  recommendations: ConciergeRecommendation[];
  confirmationRequired: boolean;
  actionTaken?: string;
}
