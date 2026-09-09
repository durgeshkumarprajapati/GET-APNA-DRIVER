import { BookingType } from '@prisma/client';

export interface PickupLocationSnapshot {
  latitude: number;
  longitude: number;
  address: string;
  label?: string | null;
}

export interface CreateBookingInput {
  pickupLocation: PickupLocationSnapshot;
  bookingType?: BookingType;
  requestedStartTime?: string | null;
  estimatedDurationMinutes?: number | null;
  customerNotes?: string | null;
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
