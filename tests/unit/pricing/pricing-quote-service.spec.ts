import { BookingType } from '@prisma/client';
import {
  createPricingQuoteSnapshot,
  toPrismaJson,
} from '@/modules/pricing/application/pricing-quote-service';

describe('Pricing Module - Pricing Quote Snapshot', () => {
  it('creates clean serializable quote snapshot', () => {
    const snapshot = createPricingQuoteSnapshot(BookingType.ONE_WAY, {
      estimatedDistanceKm: 12.5,
      estimatedDurationMinutes: 35,
      routeProvider: 'DETERMINISTIC_DEVELOPMENT',
      rates: {
        baseFare: '100.0000',
        perKilometerRate: '15.0000',
        perMinuteRate: '2.0000',
        minimumFare: '150.0000',
        platformFee: '25.0000',
        hourlyRate: '250.0000',
        dailyRate: '1800.0000',
      },
      breakdown: {
        baseFareAmount: '100.0000',
        distanceFareAmount: '187.5000',
        durationFareAmount: '70.0000',
        packageAdjustmentAmount: '0.0000',
        minimumFareAmount: '150.0000',
        platformFeeAmount: '25.0000',
        subtotalAmount: '357.5000',
        totalFareAmount: '382.5000',
      },
    });

    expect(snapshot.bookingType).toBe(BookingType.ONE_WAY);
    expect(snapshot.breakdown.totalFareAmount).toBe('382.5000');
    expect(snapshot.route.distanceKm).toBe(12.5);

    const json = toPrismaJson(snapshot);
    expect(json).toBeDefined();
  });
});
