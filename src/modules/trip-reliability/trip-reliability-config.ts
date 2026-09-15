export interface TripReliabilityConfig {
  enabled: boolean;
  customerEnabled: boolean;
  driverEnabled: boolean;
  adminEnabled: boolean;
  assignmentTimeoutSeconds: number;
  locationStaleSeconds: number;
  pickupDelaySeconds: number;
  stuckTripMinutes: number;
  dispatchRetryLimit: number;
  recoveryLockTtlSeconds: number;
  incidentCooldownSeconds: number;
}

export function getTripReliabilityConfig(): TripReliabilityConfig {
  return {
    enabled: process.env.TRIP_RELIABILITY_ENABLED !== 'false',
    customerEnabled: process.env.CUSTOMER_TRIP_RELIABILITY_ENABLED !== 'false',
    driverEnabled: process.env.DRIVER_TRIP_RELIABILITY_ENABLED !== 'false',
    adminEnabled: process.env.ADMIN_TRIP_RELIABILITY_ENABLED !== 'false',
    assignmentTimeoutSeconds: Number(process.env.TRIP_RELIABILITY_ASSIGNMENT_TIMEOUT_SECONDS || 300), // 5 min
    locationStaleSeconds: Number(process.env.TRIP_RELIABILITY_LOCATION_STALE_SECONDS || 120), // 2 min
    pickupDelaySeconds: Number(process.env.TRIP_RELIABILITY_PICKUP_DELAY_SECONDS || 600), // 10 min
    stuckTripMinutes: Number(process.env.TRIP_RELIABILITY_STUCK_TRIP_MINUTES || 30), // 30 min
    dispatchRetryLimit: Number(process.env.TRIP_RELIABILITY_DISPATCH_RETRY_LIMIT || 3),
    recoveryLockTtlSeconds: Number(process.env.TRIP_RELIABILITY_RECOVERY_LOCK_TTL_SECONDS || 30),
    incidentCooldownSeconds: Number(process.env.TRIP_RELIABILITY_INCIDENT_COOLDOWN_SECONDS || 60),
  };
}
