export type TripSignalType =
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_NEAR_PICKUP'
  | 'DRIVER_ARRIVED'
  | 'CUSTOMER_WAITING'
  | 'TRIP_STARTED'
  | 'TRIP_PROGRESS'
  | 'DESTINATION_NEAR'
  | 'TRIP_COMPLETED'
  | 'TRIP_DELAY_RISK'
  | 'SCHEDULE_CONFLICT'
  | 'SUPPORT_REQUIRED'
  | 'SAFETY_REQUIRED';

export type LocationFreshness = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type TripIntelligenceAction =
  | {
      type: 'SHOW_MAP';
      payload: {
        title: string;
        pickupLatitude: number;
        pickupLongitude: number;
        driverLatitude?: number;
        driverLongitude?: number;
      };
    }
  | {
      type: 'CALL_DRIVER';
      payload: {
        driverName?: string;
        bookingId: string;
      };
    }
  | {
      type: 'CALL_CUSTOMER';
      payload: {
        customerName?: string;
        bookingId: string;
      };
    }
  | {
      type: 'CONTACT_SUPPORT';
      payload: {
        reason: string;
        bookingId?: string;
      };
    }
  | {
      type: 'OPEN_INVOICE';
      payload: {
        invoiceId?: string;
        finalFare: number;
      };
    }
  | {
      type: 'OPEN_REVIEW';
      payload: {
        driverProfileId?: string;
        bookingId: string;
      };
    }
  | {
      type: 'OPEN_REWARD';
      payload: {
        earnedPoints: number;
        totalPoints: number;
      };
    }
  | {
      type: 'PREFILL_BOOKING';
      payload: {
        pickupAddress: string;
        dropoffAddress: string;
      };
    }
  | {
      type: 'SHOW_INCENTIVE';
      payload: {
        completedRides: number;
        targetRides: number;
        bonusAmount: number;
      };
    };

export interface TripIntelligenceResult {
  bookingId: string;
  signalType: TripSignalType;
  title: string;
  explanation: string;
  freshness: LocationFreshness;
  freshnessSeconds?: number;
  confidence: ConfidenceLevel;
  distanceMeters?: number;
  actions: TripIntelligenceAction[];
  metadata?: Record<string, unknown>;
}

export interface TripIntelligenceConfig {
  enabled: boolean;
  customerEnabled: boolean;
  driverEnabled: boolean;
  delayThresholdSeconds: number;
  locationStaleThresholdSeconds: number;
  nearPickupRadiusMeters: number;
  nearDestinationRadiusMeters: number;
  intelligenceCooldownSeconds: number;
}
