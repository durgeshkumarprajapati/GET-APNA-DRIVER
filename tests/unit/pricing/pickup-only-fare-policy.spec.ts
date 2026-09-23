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

  // GET Apna Driver charges for the driver's service (base fare + time),
  // never for distance — the customer already owns the vehicle (see
  // pricing-rules.ts's calculateFareBreakdown, where distanceFareAmount is
  // always zero for every booking type). With no dropoff and no better
  // signal, the route provider honestly reports 0km/0min rather than
  // fabricating a number it has no basis for; this file proves the pricing
  // layer never invents a fake distance, and that the minimum-fare floor
  // still covers a very short pickup-only service either way. (The driver's
  // live GPS capture in driver-journey-service.ts's completeTrip records
  // where the service actually ended for audit/history purposes — it has
  // no effect on the fare, since distance was never billed to begin with.)
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
