import type { TripIntelligenceConfig } from './trip-intelligence-types';

export function getTripIntelligenceConfig(): TripIntelligenceConfig {
  return {
    enabled: process.env.TRIP_INTELLIGENCE_ENABLED !== 'false',
    customerEnabled: process.env.CUSTOMER_TRIP_INTELLIGENCE_ENABLED !== 'false',
    driverEnabled: process.env.DRIVER_TRIP_INTELLIGENCE_ENABLED !== 'false',
    delayThresholdSeconds: Number(process.env.TRIP_DELAY_THRESHOLD_SECONDS) || 300, // 5 minutes
    locationStaleThresholdSeconds: Number(process.env.TRIP_LOCATION_STALE_THRESHOLD_SECONDS) || 60, // 1 minute
    nearPickupRadiusMeters: Number(process.env.TRIP_NEAR_PICKUP_RADIUS_METERS) || 500, // 500m
    nearDestinationRadiusMeters: Number(process.env.TRIP_NEAR_DESTINATION_RADIUS_METERS) || 500, // 500m
    intelligenceCooldownSeconds: Number(process.env.TRIP_INTELLIGENCE_COOLDOWN_SECONDS) || 30,
  };
}
