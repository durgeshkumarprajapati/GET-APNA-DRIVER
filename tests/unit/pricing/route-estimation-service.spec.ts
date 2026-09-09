import { DeterministicRouteProvider } from '@/modules/pricing/infrastructure/route-provider';
import { InvalidRouteCoordinatesError } from '@/modules/pricing/domain/pricing-errors';

describe('Pricing Module - Route Estimation Provider', () => {
  const provider = new DeterministicRouteProvider();

  it('produces deterministic reproducible distance and duration for identical coordinates', async () => {
    const pickup = { latitude: 28.5603, longitude: 77.1627 };
    const dropoff = { latitude: 28.6315, longitude: 77.2167 };

    const est1 = await provider.estimateRoute({ pickup, dropoff });
    const est2 = await provider.estimateRoute({ pickup, dropoff });

    expect(est1.distanceMeters).toBeGreaterThan(0);
    expect(est1.distanceMeters).toEqual(est2.distanceMeters);
    expect(est1.durationMinutes).toEqual(est2.durationMinutes);
    expect(est1.provider).toBe('DETERMINISTIC_DEVELOPMENT');
    expect(est1.isEstimate).toBe(true);
  });

  it('provides fallback for pickup-only local driver bookings', async () => {
    const pickup = { latitude: 28.5603, longitude: 77.1627 };

    const est = await provider.estimateRoute({ pickup });

    expect(est.distanceKm).toBe(10.0);
    expect(est.durationMinutes).toBe(30);
  });

  it('throws InvalidRouteCoordinatesError on invalid coordinates', async () => {
    const invalidPickup = { latitude: 120, longitude: 77.1627 };

    await expect(provider.estimateRoute({ pickup: invalidPickup })).rejects.toThrow(
      InvalidRouteCoordinatesError,
    );
  });
});
