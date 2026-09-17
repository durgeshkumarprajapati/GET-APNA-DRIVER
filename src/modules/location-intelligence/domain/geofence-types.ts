import 'server-only';

export type GeofenceEventType = 'GEOFENCE_ENTER' | 'GEOFENCE_EXIT' | 'GEOFENCE_DWELL';

export type GeofenceTargetType = 'PICKUP_ZONE' | 'DESTINATION_ZONE' | 'MARKETPLACE_ZONE' | 'CUSTOM';

export interface GeofenceDefinition {
  id: string;
  name: string;
  targetType: GeofenceTargetType;
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  dwellThresholdSeconds?: number;
}

export interface GeofenceEvaluationResult {
  geofenceId: string;
  targetType: GeofenceTargetType;
  isInside: boolean;
  distanceToCenterMeters: number;
  eventType?: GeofenceEventType | null;
  evaluatedAt: string;
  dwellSeconds?: number;
}

export interface GeofenceStateRecord {
  geofenceId: string;
  entityId: string; // e.g. driverProfileId or bookingId
  isInside: boolean;
  enteredAt?: string | null;
  lastEvaluatedAt: string;
  dwellSeconds: number;
}
