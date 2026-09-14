import { BookingType } from '@prisma/client';

export interface PickupLocationSnapshot {
  latitude: number;
  longitude: number;
  address: string;
  label?: string | null;
}

export interface DropoffLocationSnapshot {
  latitude: number;
  longitude: number;
  address: string;
  label?: string | null;
}

export interface CreateBookingInput {
  pickupLocation: PickupLocationSnapshot;
  dropoffLocation?: DropoffLocationSnapshot | null;
  bookingType?: BookingType;
  requestedStartTime?: string | null;
  estimatedDurationMinutes?: number | null;
  customerNotes?: string | null;
  numberOfDays?: number | null;
  hourlyPackageHours?: number | null;
  returnDate?: string | null;
  /** Optional promotion code the customer entered/selected. Always re-validated server-side — see promotion-eligibility-service.ts. */
  promotionCode?: string | null;
  /** Optional non-binding preference for one of the customer's own favorite drivers. Always re-validated server-side — see booking-service.ts. */
  preferredDriverProfileId?: string | null;
}

export interface CandidateDriverRanked {
  driverProfileId: string;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface RejectAssignmentOfferInput {
  rejectionReason?: string;
}
