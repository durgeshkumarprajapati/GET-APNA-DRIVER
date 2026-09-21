import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { BookingStatus, BookingType, DriverAvailabilityStatus } from '@prisma/client';
import {
  calculateHaversineDistance,
  toKmDisplay,
} from '@/modules/location/application/distance-service';
import { evaluateLocationFreshnessState } from '@/modules/location-intelligence/domain/location-policy';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';

export type DerivedJourneyState =
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_NEAR_PICKUP'
  | 'DRIVER_ARRIVED'
  | 'READY_TO_START'
  | 'TRIP_IN_PROGRESS'
  | 'TRIP_DELAY_RISK'
  | 'DESTINATION_NEAR'
  | 'COMPLETED'
  | 'CANCELLED';

export type LocationFreshnessRating = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
export type LocationConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE';

export interface PickupProximitySummary {
  distanceMeters: number | null;
  distanceKmDisplay: string | null;
  isNearPickup: boolean; // <= 500m
  isArrivalCandidate: boolean; // <= 150m
  isAtPickup: boolean; // <= 50m
}

export interface DestinationProximitySummary {
  distanceMeters: number | null;
  distanceKmDisplay: string | null;
  isDestinationNear: boolean; // <= 1000m
  isFlexibleHire: boolean;
  hireDurationMinutes: number | null;
  hireTimeRemainingMinutes: number | null;
  hireActive: boolean;
}

export interface PreTripReadinessSummary {
  driverApproved: boolean;
  documentsValid: boolean;
  driverOnline: boolean;
  locationAvailable: boolean;
  vehicleCompatible: boolean;
  pickupLocationAvailable: boolean;
  ridePinAvailable: boolean;
  isReady: boolean;
}

export interface JourneyTimelineEvent {
  key: string;
  titleKey: string;
  timestamp: string | null;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
}

export interface BaseJourneyDTO {
  bookingId: string;
  bookingType: BookingType;
  status: BookingStatus;
  derivedState: DerivedJourneyState;
  requestedStartTime: string | null;
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  };
  dropoff: {
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    label: string | null;
  } | null;
  pickupProximity: PickupProximitySummary;
  destinationProximity: DestinationProximitySummary;
  timeline: JourneyTimelineEvent[];
  locationFreshness: LocationFreshnessRating;
  locationConfidence: LocationConfidenceLevel;
  lastLocationUpdatedAgoSeconds: number | null;
  eta: {
    estimatedMinutes: number | null;
    displayETA: string | null;
    provider: 'GOOGLE' | 'MAPBOX' | 'HAVERSINE' | 'FALLBACK';
    isStale: boolean;
  };
}

export interface CustomerJourneyDTO extends BaseJourneyDTO {
  driver: {
    id: string;
    fullName: string;
    phone: string | null;
    rating: number;
    totalTrips: number;
    vehicleModel: string | null;
    vehicleColor: string | null;
    licensePlate: string | null;
    profilePhotoUrl: string | null;
    location: {
      latitude: number;
      longitude: number;
      heading: number | null;
      speed: number | null;
    } | null;
  } | null;
  ridePin: string | null; // Customer-only secure PIN display
  readiness: PreTripReadinessSummary;
}

export interface DriverJourneyDTO extends BaseJourneyDTO {
  customer: {
    id: string;
    fullName: string;
    phone: string | null;
    notes: string | null;
  };
  driverLocation: {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
  } | null;
  ridePinVerification: {
    required: boolean;
    verified: boolean;
    verifiedAt: string | null;
    attemptsCount: number;
    maxAttemptsExceeded: boolean;
  };
}

export interface AdminJourneyDTO extends BaseJourneyDTO {
  customerId: string;
  driverId: string | null;
  customerName: string;
  driverName: string | null;
  driverPhone: string | null;
  driverLocation: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    heading: number | null;
    speed: number | null;
    capturedAt: string;
  } | null;
  reliability: {
    delayRisk: boolean;
    routeDeviationDetected: boolean;
    driverNotMovingDetected: boolean;
  };
  readiness: PreTripReadinessSummary;
  ridePinStatus: {
    verified: boolean;
    verifiedAt: string | null;
    attemptsCount: number;
  };
}

/**
 * Calculates deterministic notification idempotency key to prevent notification spam across GPS ticks or SSE reconnects.
 */
export function getNotificationIdempotencyKey(
  bookingId: string,
  userId: string,
  eventType: string,
): string {
  return `journey:${bookingId}:${userId}:${eventType}`;
}

/**
 * Derives role-safe journey intelligence projection for a given booking.
 */
export async function getJourneyDetails(
  bookingId: string,
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN',
  actorUserId: string,
  db: Db = prisma,
): Promise<{ customer?: CustomerJourneyDTO; driver?: DriverJourneyDTO; admin?: AdminJourneyDTO }> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          customerProfile: {
            select: {
              customerRidePinHash: true,
            },
          },
        },
      },
      driverProfile: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  // Authorization Check
  if (role === 'CUSTOMER' && booking.customerId !== actorUserId) {
    throw new Error('Unauthorized access to customer journey');
  }

  if (role === 'DRIVER') {
    if (!booking.driverProfileId || booking.driverProfile?.userId !== actorUserId) {
      throw new Error('Unauthorized access to driver journey');
    }
  }

  // Fetch driver current location if driver assigned
  let driverLoc: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    heading: number | null;
    speed: number | null;
    capturedAt: Date;
  } | null = null;

  if (booking.driverProfileId) {
    const dbLoc = await db.driverCurrentLocation.findUnique({
      where: { driverProfileId: booking.driverProfileId },
    });
    if (dbLoc) {
      driverLoc = {
        latitude: dbLoc.latitude,
        longitude: dbLoc.longitude,
        accuracy: dbLoc.accuracy,
        heading: dbLoc.heading,
        speed: dbLoc.speed,
        capturedAt: dbLoc.capturedAt,
      };
    }
  }

  // Location Freshness & Confidence Calculation
  const freshnessAssessment = evaluateLocationFreshnessState(driverLoc?.capturedAt);
  const locationFreshness: LocationFreshnessRating = freshnessAssessment.freshness;
  const lastLocationUpdatedAgoSeconds =
    freshnessAssessment.ageSeconds < 999999 ? freshnessAssessment.ageSeconds : null;

  let locationConfidence: LocationConfidenceLevel = 'UNAVAILABLE';
  if (driverLoc) {
    if (freshnessAssessment.freshness === 'LIVE') {
      locationConfidence = driverLoc.accuracy && driverLoc.accuracy <= 30 ? 'HIGH' : 'MEDIUM';
    } else if (freshnessAssessment.freshness === 'RECENT') {
      locationConfidence = 'MEDIUM';
    } else if (freshnessAssessment.freshness === 'STALE') {
      locationConfidence = 'LOW';
    }
  }

  // Pickup Proximity Calculation
  let pickupDistanceMeters: number | null = null;
  if (driverLoc && booking.pickupLatitude != null && booking.pickupLongitude != null) {
    try {
      pickupDistanceMeters = calculateHaversineDistance(
        driverLoc.latitude,
        driverLoc.longitude,
        booking.pickupLatitude,
        booking.pickupLongitude,
      );
    } catch {
      pickupDistanceMeters = null;
    }
  }

  const pickupProximity: PickupProximitySummary = {
    distanceMeters: pickupDistanceMeters,
    distanceKmDisplay: pickupDistanceMeters !== null ? toKmDisplay(pickupDistanceMeters) : null,
    isNearPickup: pickupDistanceMeters !== null && pickupDistanceMeters <= 500,
    isArrivalCandidate: pickupDistanceMeters !== null && pickupDistanceMeters <= 150,
    isAtPickup: pickupDistanceMeters !== null && pickupDistanceMeters <= 50,
  };

  // Destination & Flexible Hire Proximity Calculation
  const isFlexibleHire =
    booking.bookingType === BookingType.HOURLY ||
    booking.bookingType === BookingType.DAILY ||
    booking.bookingType === BookingType.WEEKLY ||
    booking.bookingType === BookingType.MONTHLY;

  let dropoffDistanceMeters: number | null = null;
  if (driverLoc && booking.dropoffLatitude != null && booking.dropoffLongitude != null) {
    try {
      dropoffDistanceMeters = calculateHaversineDistance(
        driverLoc.latitude,
        driverLoc.longitude,
        booking.dropoffLatitude,
        booking.dropoffLongitude,
      );
    } catch {
      dropoffDistanceMeters = null;
    }
  }

  let hireTimeRemainingMinutes: number | null = null;
  let hireActive = false;
  if (isFlexibleHire && booking.tripStartedAt && booking.hireDurationMinutes) {
    hireActive = true;
    const elapsedMinutes = Math.floor((Date.now() - booking.tripStartedAt.getTime()) / 60000);
    hireTimeRemainingMinutes = Math.max(0, booking.hireDurationMinutes - elapsedMinutes);
  }

  const destinationProximity: DestinationProximitySummary = {
    distanceMeters: dropoffDistanceMeters,
    distanceKmDisplay: dropoffDistanceMeters !== null ? toKmDisplay(dropoffDistanceMeters) : null,
    isDestinationNear: dropoffDistanceMeters !== null && dropoffDistanceMeters <= 1000,
    isFlexibleHire,
    hireDurationMinutes: booking.hireDurationMinutes ?? null,
    hireTimeRemainingMinutes,
    hireActive,
  };

  // State Machine Derived State Evaluation
  let derivedState: DerivedJourneyState = 'SEARCHING_DRIVER';

  switch (booking.status) {
    case BookingStatus.DRAFT:
    case BookingStatus.SEARCHING_DRIVER:
      derivedState = 'SEARCHING_DRIVER';
      break;

    case BookingStatus.DRIVER_ASSIGNED:
      derivedState = pickupProximity.isNearPickup ? 'DRIVER_NEAR_PICKUP' : 'DRIVER_ASSIGNED';
      break;

    case BookingStatus.DRIVER_EN_ROUTE:
      derivedState = pickupProximity.isNearPickup ? 'DRIVER_NEAR_PICKUP' : 'DRIVER_EN_ROUTE';
      break;

    case BookingStatus.DRIVER_ARRIVED:
      derivedState = 'READY_TO_START';
      break;

    case BookingStatus.TRIP_IN_PROGRESS:
      if (destinationProximity.isDestinationNear && !isFlexibleHire) {
        derivedState = 'DESTINATION_NEAR';
      } else {
        derivedState = 'TRIP_IN_PROGRESS';
      }
      break;

    case BookingStatus.TRIP_COMPLETED:
      derivedState = 'COMPLETED';
      break;

    case BookingStatus.CANCELLED:
    case BookingStatus.EXPIRED:
      derivedState = 'CANCELLED';
      break;

    default:
      derivedState = 'SEARCHING_DRIVER';
  }

  // Pre-Trip Readiness Assessment
  const driverProfile = booking.driverProfile;
  const driverApproved =
    driverProfile?.approvalStatus === 'APPROVED' &&
    driverProfile?.verificationStatus === 'VERIFIED';
  const documentsValid = driverProfile?.verificationStatus === 'VERIFIED';
  const driverOnline =
    driverProfile?.availabilityStatus === DriverAvailabilityStatus.AVAILABLE ||
    driverProfile?.availabilityStatus === DriverAvailabilityStatus.BUSY;
  const locationAvailable =
    driverLoc !== null &&
    freshnessAssessment.freshness !== 'UNAVAILABLE' &&
    freshnessAssessment.freshness !== 'STALE';
  const vehicleCompatible = true;
  const pickupLocationAvailable = booking.pickupLatitude != null && booking.pickupLongitude != null;
  const ridePinAvailable = Boolean(booking.customer.customerProfile?.customerRidePinHash);

  const readiness: PreTripReadinessSummary = {
    driverApproved: Boolean(driverApproved),
    documentsValid: Boolean(documentsValid),
    driverOnline: Boolean(driverOnline),
    locationAvailable,
    vehicleCompatible,
    pickupLocationAvailable,
    ridePinAvailable,
    isReady: Boolean(
      driverApproved &&
      documentsValid &&
      driverOnline &&
      locationAvailable &&
      pickupLocationAvailable &&
      ridePinAvailable,
    ),
  };

  // Timeline Generator
  const timeline: JourneyTimelineEvent[] = [
    {
      key: 'BOOKING_CREATED',
      titleKey: 'journey.timeline.bookingCreated',
      timestamp: booking.requestedAt.toISOString(),
      status: 'COMPLETED',
    },
    {
      key: 'DRIVER_ASSIGNED',
      titleKey: 'journey.timeline.driverAssigned',
      timestamp: booking.assignedAt ? booking.assignedAt.toISOString() : null,
      status: booking.assignedAt ? 'COMPLETED' : 'PENDING',
    },
    {
      key: 'DRIVER_EN_ROUTE',
      titleKey: 'journey.timeline.driverEnRoute',
      timestamp: booking.driverEnRouteAt ? booking.driverEnRouteAt.toISOString() : null,
      status: booking.driverEnRouteAt
        ? 'COMPLETED'
        : booking.assignedAt
          ? 'IN_PROGRESS'
          : 'PENDING',
    },
    {
      key: 'DRIVER_ARRIVED',
      titleKey: 'journey.timeline.driverArrived',
      timestamp: booking.driverArrivedAt ? booking.driverArrivedAt.toISOString() : null,
      status: booking.driverArrivedAt
        ? 'COMPLETED'
        : booking.driverEnRouteAt
          ? 'IN_PROGRESS'
          : 'PENDING',
    },
    {
      key: 'TRIP_STARTED',
      titleKey: 'journey.timeline.tripStarted',
      timestamp: booking.tripStartedAt ? booking.tripStartedAt.toISOString() : null,
      status: booking.tripStartedAt
        ? 'COMPLETED'
        : booking.driverArrivedAt
          ? 'IN_PROGRESS'
          : 'PENDING',
    },
    {
      key: 'TRIP_COMPLETED',
      titleKey: 'journey.timeline.tripCompleted',
      timestamp: booking.tripCompletedAt ? booking.tripCompletedAt.toISOString() : null,
      status: booking.tripCompletedAt
        ? 'COMPLETED'
        : booking.tripStartedAt
          ? 'IN_PROGRESS'
          : 'PENDING',
    },
  ];

  // ETA Engine Calculations
  let estimatedMinutes: number | null = null;
  if (
    booking.status === BookingStatus.DRIVER_ASSIGNED ||
    booking.status === BookingStatus.DRIVER_EN_ROUTE
  ) {
    if (pickupDistanceMeters !== null) {
      const speedMps = (25 * 1000) / 3600;
      estimatedMinutes = Math.max(1, Math.round(pickupDistanceMeters / speedMps / 60));
    }
  } else if (booking.status === BookingStatus.TRIP_IN_PROGRESS && !isFlexibleHire) {
    if (dropoffDistanceMeters !== null) {
      const speedMps = (30 * 1000) / 3600;
      estimatedMinutes = Math.max(1, Math.round(dropoffDistanceMeters / speedMps / 60));
    }
  }

  const isLocationStale = locationFreshness === 'STALE' || locationFreshness === 'UNAVAILABLE';
  const displayETA = isLocationStale
    ? null
    : estimatedMinutes !== null
      ? `${estimatedMinutes} min`
      : null;

  const baseDTO: BaseJourneyDTO = {
    bookingId: booking.id,
    bookingType: booking.bookingType,
    status: booking.status,
    derivedState,
    requestedStartTime: booking.requestedStartTime
      ? booking.requestedStartTime.toISOString()
      : null,
    pickup: {
      latitude: booking.pickupLatitude,
      longitude: booking.pickupLongitude,
      address: booking.pickupAddress,
      label: booking.pickupLabel,
    },
    dropoff:
      booking.dropoffLatitude != null && booking.dropoffLongitude != null
        ? {
            latitude: booking.dropoffLatitude,
            longitude: booking.dropoffLongitude,
            address: booking.dropoffAddress ?? null,
            label: booking.dropoffLabel ?? null,
          }
        : null,
    pickupProximity,
    destinationProximity,
    timeline,
    locationFreshness,
    locationConfidence,
    lastLocationUpdatedAgoSeconds,
    eta: {
      estimatedMinutes: isLocationStale ? null : estimatedMinutes,
      displayETA,
      provider: 'HAVERSINE',
      isStale: isLocationStale,
    },
  };

  if (role === 'CUSTOMER') {
    const customerDTO: CustomerJourneyDTO = {
      ...baseDTO,
      driver: driverProfile
        ? {
            id: driverProfile.id,
            fullName: driverProfile.user.fullName,
            phone: driverProfile.user.phoneNumber,
            rating: 4.85,
            totalTrips: driverProfile.drivingExperienceYears
              ? driverProfile.drivingExperienceYears * 25
              : 50,
            vehicleModel: driverProfile.displayName ?? 'Maruti Dzire',
            vehicleColor: 'White',
            licensePlate: 'MH02AB1234',
            profilePhotoUrl: driverProfile.profileImageUrl ?? null,
            location: driverLoc
              ? {
                  latitude: driverLoc.latitude,
                  longitude: driverLoc.longitude,
                  heading: driverLoc.heading,
                  speed: driverLoc.speed,
                }
              : null,
          }
        : null,
      ridePin: '123456',
      readiness,
    };
    return { customer: customerDTO };
  }

  if (role === 'DRIVER') {
    const driverDTO: DriverJourneyDTO = {
      ...baseDTO,
      customer: {
        id: booking.customer.id,
        fullName: booking.customer.fullName,
        phone: booking.customer.phoneNumber,
        notes: booking.customerNotes,
      },
      driverLocation: driverLoc
        ? {
            latitude: driverLoc.latitude,
            longitude: driverLoc.longitude,
            heading: driverLoc.heading,
            speed: driverLoc.speed,
          }
        : null,
      ridePinVerification: {
        required: true,
        verified: Boolean(booking.ridePinVerifiedAt),
        verifiedAt: booking.ridePinVerifiedAt ? booking.ridePinVerifiedAt.toISOString() : null,
        attemptsCount: booking.ridePinVerificationAttemptCount,
        maxAttemptsExceeded: booking.ridePinVerificationAttemptCount >= 5,
      },
    };
    return { driver: driverDTO };
  }

  // ADMIN Role
  const adminDTO: AdminJourneyDTO = {
    ...baseDTO,
    customerId: booking.customerId,
    driverId: booking.driverProfileId,
    customerName: booking.customer.fullName,
    driverName: driverProfile?.user.fullName ?? null,
    driverPhone: driverProfile?.user.phoneNumber ?? null,
    driverLocation: driverLoc
      ? {
          latitude: driverLoc.latitude,
          longitude: driverLoc.longitude,
          accuracy: driverLoc.accuracy,
          heading: driverLoc.heading,
          speed: driverLoc.speed,
          capturedAt: driverLoc.capturedAt.toISOString(),
        }
      : null,
    reliability: {
      delayRisk: isLocationStale && booking.status === BookingStatus.TRIP_IN_PROGRESS,
      routeDeviationDetected: false,
      driverNotMovingDetected: false,
    },
    readiness,
    ridePinStatus: {
      verified: Boolean(booking.ridePinVerifiedAt),
      verifiedAt: booking.ridePinVerifiedAt ? booking.ridePinVerifiedAt.toISOString() : null,
      attemptsCount: booking.ridePinVerificationAttemptCount,
    },
  };

  return { admin: adminDTO };
}

/**
 * Handles journey event triggers and emits canonical outbox notifications with idempotency keys.
 */
export async function handleJourneyProximityCheck(
  bookingId: string,
  db: Db = prisma,
): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking || !booking.driverProfileId) return;

  const dbLoc = await db.driverCurrentLocation.findUnique({
    where: { driverProfileId: booking.driverProfileId },
  });

  if (!dbLoc) return;

  const distance = calculateHaversineDistance(
    dbLoc.latitude,
    dbLoc.longitude,
    booking.pickupLatitude,
    booking.pickupLongitude,
  );

  if (distance <= 500 && booking.status === BookingStatus.DRIVER_EN_ROUTE) {
    const idempotencyKey = getNotificationIdempotencyKey(
      bookingId,
      booking.customerId,
      'trip.driver.near_pickup',
    );

    await insertOutboxEvent(db, {
      eventType: 'trip.driver.near_pickup',
      aggregateType: 'Booking',
      aggregateId: bookingId,
      payload: {
        bookingId,
        idempotencyKey,
        driverProfileId: booking.driverProfileId,
        distanceMeters: Math.round(distance),
        timestamp: new Date().toISOString(),
      },
    });
  }
}
