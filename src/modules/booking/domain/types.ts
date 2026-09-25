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

export interface ServiceRecipientInput {
  fullName: string;
  phone: string;
  email?: string | null;
  relationship?: string | null;
  notes?: string | null;
  notifyViaWhatsApp?: boolean;
}

export interface CreateBookingInput {
  pickupLocation: PickupLocationSnapshot;
  dropoffLocation?: DropoffLocationSnapshot | null;
  bookingType?: BookingType;
  requestedStartTime?: string | null;
  estimatedDurationMinutes?: number | null;
  hireDurationMinutes?: number | null;
  hireStartAt?: string | null;
  hireEndAt?: string | null;
  customerNotes?: string | null;
  numberOfDays?: number | null;
  numberOfWeeks?: number | null;
  numberOfMonths?: number | null;
  hourlyPackageHours?: number | null;
  returnDate?: string | null;
  /** Optional promotion code the customer entered/selected. Always re-validated server-side — see promotion-eligibility-service.ts. */
  promotionCode?: string | null;
  /** Optional non-binding preference for one of the customer's own favorite drivers. Always re-validated server-side — see booking-service.ts. */
  preferredDriverProfileId?: string | null;
  /** Optional customer vehicle requirement ID. Validated server-side — see booking-service.ts. */
  vehicleCategoryId?: string | null;
  /** Optional customer vehicle requirement code. Validated server-side — see booking-service.ts. */
  vehicleCategoryCode?: string | null;
  /** Optional service recipient details when booking a driver for someone else. */
  serviceRecipient?: ServiceRecipientInput | null;
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
