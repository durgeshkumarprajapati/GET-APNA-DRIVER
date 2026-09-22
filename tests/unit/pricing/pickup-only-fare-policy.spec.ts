import { BookingType } from '@prisma/client';
import {
  calculateEstimatedFare,
  calculateFinalFare,
} from '@/modules/pricing/application/fare-calculation-service';
import { DeterministicRouteProvider } from '@/modules/pricing/infrastructure/route-provider';

import { type Db } from '@/shared/database/prisma';

describe('Pickup-Only Fare Policy Unit Tests', () => {
  const mockDb = {
    configurationSetting: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    systemConfiguration: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  } as unknown as Db;

  const pickup = { latitude: 28.6139, longitude: 77.209 };

  it('calculates non-zero estimated fare for POINT_TO_POINT pickup-only booking without dropoff', async () => {
    const result = await calculateEstimatedFare(
      {
        bookingType: BookingType.POINT_TO_POINT,
        pickup,
        dropoff: null,
      },
      mockDb,
    );

    expect(result.estimatedDistanceKm).toBeGreaterThan(0);
    expect(result.estimatedDurationMinutes).toBeGreaterThan(0);
    const fare = Number(result.breakdown.totalFareAmount);
    expect(fare).toBeGreaterThanOrEqual(150); // Minimum fare threshold
  });

  it('calculates non-zero estimated fare for ONE_WAY pickup-only booking', async () => {
    const result = await calculateEstimatedFare(
      {
        bookingType: BookingType.ONE_WAY,
        pickup,
        dropoff: null,
      },
      mockDb,
    );

    expect(result.estimatedDistanceKm).toBe(5.0);
    expect(result.estimatedDurationMinutes).toBe(15);
    expect(Number(result.breakdown.totalFareAmount)).toBeGreaterThan(0);
  });

  it('calculates final fare using minimum fare threshold when actual duration/distance is near zero', async () => {
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

  it('DeterministicRouteProvider returns 5km / 15min estimate when dropoff is omitted', async () => {
    const provider = new DeterministicRouteProvider();
    const route = await provider.estimateRoute({
      pickup,
      dropoff: null,
      bookingType: BookingType.ONE_WAY,
    });

    expect(route.distanceKm).toBe(5.0);
    expect(route.durationMinutes).toBe(15);
    expect(route.provider).toBe('DETERMINISTIC_DEVELOPMENT');
  });
});
