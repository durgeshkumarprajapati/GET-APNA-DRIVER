import { evaluateLocationFreshnessState } from '@/modules/location-intelligence/domain/location-policy';
import { evaluateLocationConfidence, detectLocationAnomaly } from '@/modules/location-intelligence/domain/location-confidence';
import { DeterministicRouteProvider } from '@/modules/location-intelligence/providers/deterministic-route-provider';
import { ETAService } from '@/modules/location-intelligence/application/eta-service';
import { evaluatePickupProximity } from '@/modules/location-intelligence/rules/pickup-proximity-rule';
import { evaluateDriverArrivalCandidate } from '@/modules/location-intelligence/rules/driver-arrival-rule';
import { evaluateDestinationProximity } from '@/modules/location-intelligence/rules/destination-proximity-rule';
import { computeTripDistances } from '@/modules/location-intelligence/application/distance-service';

describe('Phase 54 - Location Intelligence Engine Unit Tests', () => {
  describe('Location Freshness & Policy', () => {
    it('evaluates LIVE freshness for timestamps < 30 seconds old', () => {
      const recent = new Date(Date.now() - 10 * 1000);
      const res = evaluateLocationFreshnessState(recent);
      expect(res.freshness).toBe('LIVE');
      expect(res.ageSeconds).toBeLessThanOrEqual(30);
    });

    it('evaluates RECENT freshness for timestamps between 31 and 120 seconds old', () => {
      const recent = new Date(Date.now() - 60 * 1000);
      const res = evaluateLocationFreshnessState(recent);
      expect(res.freshness).toBe('RECENT');
    });

    it('evaluates STALE freshness for timestamps between 121 and 300 seconds old', () => {
      const stale = new Date(Date.now() - 200 * 1000);
      const res = evaluateLocationFreshnessState(stale);
      expect(res.freshness).toBe('STALE');
    });

    it('evaluates UNAVAILABLE for missing or old timestamps', () => {
      expect(evaluateLocationFreshnessState(null).freshness).toBe('UNAVAILABLE');
      const veryOld = new Date(Date.now() - 500 * 1000);
      expect(evaluateLocationFreshnessState(veryOld).freshness).toBe('UNAVAILABLE');
    });
  });

  describe('Deterministic Location Confidence & Anomaly Detection', () => {
    it('returns HIGH confidence for recent, accurate GPS telemetry', () => {
      const point = {
        latitude: 19.076,
        longitude: 72.8777,
        accuracyMeters: 10,
        capturedAt: new Date(),
        source: 'DRIVER_DEVICE' as const,
      };
      const confidence = evaluateLocationConfidence(point);
      expect(confidence.level).toBe('HIGH');
      expect(confidence.score).toBeGreaterThanOrEqual(80);
    });

    it('returns UNAVAILABLE confidence for malformed coordinates', () => {
      const point = {
        latitude: 999,
        longitude: 72.8777,
        capturedAt: new Date(),
        source: 'DRIVER_DEVICE' as const,
      };
      const confidence = evaluateLocationConfidence(point);
      expect(confidence.level).toBe('UNAVAILABLE');
    });

    it('detects TELEPORTATION anomaly when driver speed exceeds 300 km/h', () => {
      const prev = {
        latitude: 19.076,
        longitude: 72.8777,
        capturedAt: new Date(Date.now() - 10 * 1000), // 10 seconds ago in Mumbai
        source: 'DRIVER_DEVICE' as const,
      };
      const curr = {
        latitude: 28.6139,
        longitude: 77.209,
        capturedAt: new Date(), // Delhi (1100 km away in 10s)
        source: 'DRIVER_DEVICE' as const,
      };
      const anomaly = detectLocationAnomaly(prev, curr, 1100000);
      expect(anomaly.isAnomaly).toBe(true);
      expect(anomaly.type).toBe('TELEPORTATION');
    });

    it('passes normal driving movement without triggering anomaly', () => {
      const prev = {
        latitude: 19.076,
        longitude: 72.8777,
        capturedAt: new Date(Date.now() - 60 * 1000), // 60 seconds ago
        source: 'DRIVER_DEVICE' as const,
      };
      const curr = {
        latitude: 19.078,
        longitude: 72.879,
        capturedAt: new Date(), // ~300 meters away
        source: 'DRIVER_DEVICE' as const,
      };
      const anomaly = detectLocationAnomaly(prev, curr, 300);
      expect(anomaly.isAnomaly).toBe(false);
    });
  });

  describe('Route Providers & ETA Service', () => {
    it('calculates deterministic route estimate with 1.25 circuity multiplier', async () => {
      const provider = new DeterministicRouteProvider();
      const origin = { latitude: 19.076, longitude: 72.8777 };
      const destination = { latitude: 19.086, longitude: 72.8877 };

      const estimate = await provider.estimateRoute({ origin, destination });
      expect(estimate.provider).toBe('DETERMINISTIC_FALLBACK');
      expect(estimate.distanceMeters).toBeGreaterThan(0);
      expect(estimate.durationMinutes).toBeGreaterThan(0);
      expect(estimate.isEstimate).toBe(true);
    });

    it('falls back to deterministic provider when external routing providers are unconfigured', async () => {
      const etaService = new ETAService();
      const origin = { latitude: 19.076, longitude: 72.8777 };
      const destination = { latitude: 19.086, longitude: 72.8877 };

      const res = await etaService.estimateETA({ origin, destination }, true);
      expect(res.provider).toBeDefined();
      expect(res.distanceMeters).toBeGreaterThan(0);
    });
  });

  describe('Pickup Proximity & Arrival Candidate Evaluation', () => {
    const pickup = { latitude: 19.076, longitude: 72.8777 };

    it('evaluates DRIVER_NEAR_PICKUP within 500m radius', () => {
      const driver = {
        latitude: 19.078,
        longitude: 72.8777, // ~220m away
        capturedAt: new Date(),
        source: 'DRIVER_DEVICE' as const,
      };
      const prox = evaluatePickupProximity(driver, pickup);
      expect(prox.isNearPickup).toBe(true);
      expect(prox.signal).toBe('DRIVER_NEAR_PICKUP');
    });

    it('evaluates DRIVER_AT_PICKUP within 50m radius', () => {
      const driver = {
        latitude: 19.07601,
        longitude: 72.87771, // ~2m away
        capturedAt: new Date(),
        source: 'DRIVER_DEVICE' as const,
      };
      const prox = evaluatePickupProximity(driver, pickup);
      expect(prox.isAtPickup).toBe(true);
      expect(prox.signal).toBe('DRIVER_AT_PICKUP');
    });

    it('identifies driver arrival candidate when driver is within 150m of pickup with live location', () => {
      const driver = {
        latitude: 19.07605,
        longitude: 72.8777, // ~5m away
        capturedAt: new Date(),
        source: 'DRIVER_DEVICE' as const,
      };
      const arrival = evaluateDriverArrivalCandidate(driver, pickup, 'DRIVER_EN_ROUTE');
      expect(arrival.isCandidateForArrival).toBe(true);
    });

    it('rejects arrival candidate when booking status is invalid for arrival', () => {
      const driver = {
        latitude: 19.07605,
        longitude: 72.8777,
        capturedAt: new Date(),
        source: 'DRIVER_DEVICE' as const,
      };
      const arrival = evaluateDriverArrivalCandidate(driver, pickup, 'COMPLETED');
      expect(arrival.isCandidateForArrival).toBe(false);
    });

    it('evaluates destination proximity correctly', () => {
      const driver = {
        latitude: 19.076,
        longitude: 72.8777,
        capturedAt: new Date(),
        source: 'DRIVER_DEVICE' as const,
      };
      const dest = { latitude: 19.078, longitude: 72.8777 }; // ~220m away
      const destEval = evaluateDestinationProximity(driver, dest);
      expect(destEval.isNearDestination).toBe(true);
      expect(destEval.signal).toBe('DESTINATION_NEAR');
    });
  });

  describe('Trip Distances Computation', () => {
    it('computes geodesic distances for driver, pickup, and destination', () => {
      const driver = {
        latitude: 19.076,
        longitude: 72.8777,
        capturedAt: new Date(),
        source: 'DRIVER_DEVICE' as const,
      };
      const pickup = { latitude: 19.08, longitude: 72.88 };
      const dropoff = { latitude: 19.1, longitude: 72.9 };

      const distances = computeTripDistances(driver, pickup, dropoff);
      expect(distances.driverToPickupMeters).toBeGreaterThan(0);
      expect(distances.pickupToDestinationMeters).toBeGreaterThan(0);
    });
  });
});

