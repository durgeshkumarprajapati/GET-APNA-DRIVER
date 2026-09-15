import type {
  TripReliabilityIncidentType,
  TripReliabilityIncidentSeverity,
  TripReliabilityIncidentStatus,
  TripReliabilityConfidence,
} from '@prisma/client';

export type IncidentType = TripReliabilityIncidentType;
export type IncidentSeverity = TripReliabilityIncidentSeverity;
export type IncidentStatus = TripReliabilityIncidentStatus;
export type IncidentConfidence = TripReliabilityConfidence;

export interface IncidentRecord {
  id: string;
  incidentNumber: string;
  bookingId: string;
  customerId?: string | null;
  driverProfileId?: string | null;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  confidence: IncidentConfidence;
  fingerprint: string;
  metadata?: Record<string, unknown> | null;
  resolutionCode?: string | null;
  detectedAt: Date;
  confirmedAt?: Date | null;
  resolvedAt?: Date | null;
  escalatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineRecord {
  id: string;
  incidentId: string;
  fromStatus?: IncidentStatus | null;
  toStatus?: IncidentStatus | null;
  action: string;
  actorUserId?: string | null;
  actorRole: string;
  notes?: string | null;
  createdAt: Date;
}

export interface RuleEvaluationInput {
  bookingId: string;
  status: string;
  customerId?: string | null;
  driverProfileId?: string | null;
  driverId?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  driverEnRouteAt?: Date | null;
  driverArrivedAt?: Date | null;
  tripStartedAt?: Date | null;
  tripCompletedAt?: Date | null;
  scheduledPickupTime?: Date | null;
  latestTelemetryCapturedAt?: Date | null;
  driverLatitude?: number | null;
  driverLongitude?: number | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dispatchAttemptCount?: number;
  lastDispatchFailureReason?: string | null;
  activeSafetyIncident?: boolean;
  paymentCaptured?: boolean;
  finalFareAmount?: number | null;
  hasTaxInvoice?: boolean;
  scheduledRideMissedDispatch?: boolean;
  notificationFailedCount?: number;
}

export interface RuleEvaluationResult {
  detected: boolean;
  type: IncidentType;
  severity: IncidentSeverity;
  confidence: IncidentConfidence;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface RecoveryResult {
  success: boolean;
  actionTaken: string;
  notes: string;
  escalated?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CustomerReliabilityView {
  bookingId: string;
  hasActiveIncident: boolean;
  incidentType?: IncidentType;
  severity?: IncidentSeverity;
  statusTitle: string;
  statusExplanation: string;
  recommendedAction?: {
    type: 'CALL_DRIVER' | 'CONTACT_SUPPORT' | 'VIEW_MAP' | 'REBOOK';
    label: string;
    payload?: Record<string, unknown>;
  };
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    freshness: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
    freshnessAgeSeconds?: number;
  };
}

export interface DriverReliabilityView {
  bookingId: string;
  hasActiveIncident: boolean;
  incidentType?: IncidentType;
  severity?: IncidentSeverity;
  statusTitle: string;
  statusExplanation: string;
  recommendedAction?: {
    type: 'VIEW_PICKUP' | 'CALL_CUSTOMER' | 'CONTACT_SUPPORT';
    label: string;
    payload?: Record<string, unknown>;
  };
}
