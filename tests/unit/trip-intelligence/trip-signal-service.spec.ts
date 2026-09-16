import { TripSignalService } from '@/modules/trip-intelligence/trip-signal-service';

describe('TripSignalService Unit Tests', () => {
  const signalService = new TripSignalService();

  describe('Signal Extraction from Booking State', () => {
    it('should extract DRIVER_ASSIGNED signal when driver is assigned but not en route', () => {
      const result = signalService.extractSignal({
        status: 'ASSIGNED',
        pickupLatitude: 22.3072,
        pickupLongitude: 73.1812,
        dropoffLatitude: 22.315,
        dropoffLongitude: 73.2,
        driverTelemetry: null,
      });

      expect(result.signalType).toBe('DRIVER_ASSIGNED');
      expect(result.freshness).toBe('UNAVAILABLE');
    });

    it('should extract DRIVER_EN_ROUTE signal when driver is en route with fresh telemetry', () => {
      const result = signalService.extractSignal({
        status: 'ASSIGNED',
        pickupLatitude: 22.3072,
        pickupLongitude: 73.1812,
        driverEnRouteAt: new Date(),
        driverTelemetry: {
          latitude: 22.32,
          longitude: 73.19,
          capturedAt: new Date(Date.now() - 5000), // 5s ago
        },
      });

      expect(result.signalType).toBe('DRIVER_EN_ROUTE');
      expect(result.freshness).toBe('LIVE');
    });

    it('should extract DRIVER_NEAR_PICKUP when driver is within 500m of pickup', () => {
      const result = signalService.extractSignal({
        status: 'ASSIGNED',
        pickupLatitude: 22.3072,
        pickupLongitude: 73.1812,
        driverEnRouteAt: new Date(),
        driverTelemetry: {
          latitude: 22.3074, // ~30m
          longitude: 73.1813,
          capturedAt: new Date(Date.now() - 5000),
        },
      });

      expect(result.signalType).toBe('DRIVER_NEAR_PICKUP');
      expect(result.distanceMeters).toBeLessThan(500);
    });

    it('should extract TRIP_STARTED signal when trip status is IN_PROGRESS', () => {
      const result = signalService.extractSignal({
        status: 'IN_PROGRESS',
        pickupLatitude: 22.3072,
        pickupLongitude: 73.1812,
        tripStartedAt: new Date(),
        driverTelemetry: null,
      });

      expect(result.signalType).toBe('TRIP_STARTED');
    });

    it('should extract TRIP_COMPLETED signal when trip status is TRIP_COMPLETED', () => {
      const result = signalService.extractSignal({
        status: 'TRIP_COMPLETED',
        pickupLatitude: 22.3072,
        pickupLongitude: 73.1812,
        tripCompletedAt: new Date(),
        driverTelemetry: null,
      });

      expect(result.signalType).toBe('TRIP_COMPLETED');
    });

    it('should extract SAFETY_REQUIRED signal when active safety incident exists', () => {
      const result = signalService.extractSignal({
        status: 'IN_PROGRESS',
        pickupLatitude: 22.3072,
        pickupLongitude: 73.1812,
        activeSafetyIncident: true,
      });

      expect(result.signalType).toBe('SAFETY_REQUIRED');
    });
  });
});
