import { BookingType } from '@prisma/client';
import {
  calculateEstimatedFare,
  calculateFinalFare,
} from '@/modules/pricing/application/fare-calculation-service';
import { DeterministicRouteProvider } from '@/modules/pricing/infrastructure/route-provider';

import { type Db } from '@/shared/database/prisma';

describe('Pickup-Only Fare Policy Unit Tests', () => {
  const mockDb = {
    systemConfiguration: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  } as unknown as Db;

  const pickup = { latitude: 28.6139, longitude: 77.209 };

  // POINT_TO_POINT/ONE_WAY are the only two BookingTypes priced by real
  // distance (see pricing-rules.ts). With no dropoff and no better signal,
  // the route provider honestly reports 0km rather than fabricating a
  // number it has no basis for — the minimum-fare floor then covers the
  // charge. The real fix for this (using the driver's live GPS location at
  // trip completion as a stand-in dropoff) lives in driver-journey-
  // service.ts's completeTrip and is covered there; this file only proves
  // the pricing layer itself never invents a fake distance on its own.
  it('reports zero distance/duration for a POINT_TO_POINT pickup-only estimate, and the minimum fare floor covers the charge', async () => {
    const result = await calculateEstimatedFare(
      {
        bookingType: BookingType.POINT_TO_POINT,
        pickup,
        dropoff: null,
      },
      mockDb,
    );

    expect(result.estimatedDistanceKm).toBe(0);
    expect(result.estimatedDurationMinutes).toBe(0);
    const fare = Number(result.breakdown.totalFareAmount);
    expect(fare).toBeGreaterThanOrEqual(150); // Minimum fare threshold
  });

  it('reports zero distance/duration for a ONE_WAY pickup-only estimate', async () => {
    const result = await calculateEstimatedFare(
      {
        bookingType: BookingType.ONE_WAY,
        pickup,
        dropoff: null,
      },
      mockDb,
    );

    expect(result.estimatedDistanceKm).toBe(0);
    expect(result.estimatedDurationMinutes).toBe(0);
    expect(Number(result.breakdown.totalFareAmount)).toBeGreaterThan(0);
  });

  it('calculates final fare using the minimum fare threshold when no dropoff and no actual distance are available', async () => {
    const result = await calculateFinalFare(
      {
        bookingType: BookingType.POINT_TO_POINT,
        pickup,
        dropoff: null,
        actualDurationMinutes: 2,
      },
      mockDb,
    );

    const totalFare = Number(result.breakdown.totalFareAmount);
    // minimumFare (150) + platformFee (25) = 175
    expect(totalFare).toBeGreaterThanOrEqual(175);
  });

  it('DeterministicRouteProvider honestly reports 0km/0min when dropoff is omitted, rather than fabricating a distance', async () => {
    const provider = new DeterministicRouteProvider();
    const route = await provider.estimateRoute({
      pickup,
      dropoff: null,
      bookingType: BookingType.ONE_WAY,
    });

    expect(route.distanceKm).toBe(0);
    expect(route.durationMinutes).toBe(0);
    expect(route.provider).toBe('DETERMINISTIC_DEVELOPMENT');
  });
});
