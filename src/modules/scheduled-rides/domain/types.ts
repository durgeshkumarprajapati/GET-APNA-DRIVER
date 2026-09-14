import type {
  ScheduledRideStatus,
  ScheduleType,
  RecurrenceFrequency,
  BookingType,
  OccurrenceStatus,
} from '@prisma/client';

export interface CreateScheduledRideInput {
  scheduleType: ScheduleType;
  bookingType?: BookingType;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  pickupLabel?: string | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  dropoffAddress?: string | null;
  dropoffLabel?: string | null;
  savedLocationId?: string | null;
  vehicleCategory?: string;
  preferredDriverProfileId?: string | null;
  promotionCode?: string | null;
  scheduledTime: string; // "HH:mm" in 24h local time e.g. "08:30"
  scheduledDate?: string | Date | null; // For ONE_TIME
  recurrenceFrequency?: RecurrenceFrequency | null;
  daysOfWeek?: number[]; // e.g. [1, 3, 5] (1=Mon, 7=Sun)
  timezone?: string;
  startAt?: string | Date;
  endAt?: string | Date | null;
  notes?: string | null;
  idempotencyKey?: string | null;
}

export interface UpdateScheduledRideInput {
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupAddress?: string;
  pickupLabel?: string | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  dropoffAddress?: string | null;
  dropoffLabel?: string | null;
  vehicleCategory?: string;
  preferredDriverProfileId?: string | null;
  promotionCode?: string | null;
  scheduledTime?: string;
  scheduledDate?: string | Date | null;
  recurrenceFrequency?: RecurrenceFrequency | null;
  daysOfWeek?: number[];
  endAt?: string | Date | null;
  notes?: string | null;
}

export interface ScheduledRideDTO {
  id: string;
  customerId: string;
  status: ScheduledRideStatus;
  scheduleType: ScheduleType;
  bookingType: BookingType;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  };
  dropoffLocation: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  } | null;
  savedLocationId: string | null;
  vehicleCategory: string | null;
  preferredDriver: {
    id: string;
    displayName: string | null;
  } | null;
  promotionCode: string | null;
  scheduledTime: string;
  scheduledDate: string | null;
  recurrenceFrequency: RecurrenceFrequency | null;
  daysOfWeek: number[];
  timezone: string;
  startAt: string;
  endAt: string | null;
  nextOccurrenceAt: string | null;
  lastGeneratedAt: string | null;
  failureReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledRideOccurrenceDTO {
  id: string;
  scheduledRideId: string;
  occurrenceStart: string;
  occurrenceIdempotencyKey: string;
  bookingId: string | null;
  status: OccurrenceStatus;
  failureReason: string | null;
  createdAt: string;
}
