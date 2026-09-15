import { evaluateLocationStale } from '@/modules/trip-reliability/rules/location-stale-rule';

describe('evaluateLocationStale', () => {
  it('should detect stale location if driver location is older than threshold during active ride', () => {
    const input = {
      bookingId: 'b3',
      status: 'DRIVER_EN_ROUTE',
      driverProfileId: 'd1',
      driverEnRouteAt: new Date(Date.now() - 10 * 60 * 1000),
      latestTelemetryCapturedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago (stale)
    };

    const evaluation = evaluateLocationStale(input);
    expect(evaluation).not.toBeNull();
    expect(evaluation?.detected).toBe(true);
    expect(evaluation?.type).toBe('DRIVER_LOCATION_STALE');
  });

  it('should not detect stale location if location captured within threshold', () => {
    const input = {
      bookingId: 'b4',
      status: 'DRIVER_EN_ROUTE',
      driverProfileId: 'd1',
      driverEnRouteAt: new Date(Date.now() - 10 * 60 * 1000),
      latestTelemetryCapturedAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago (fresh)
    };

    const evaluation = evaluateLocationStale(input);
    expect(evaluation).toBeNull();
  });
});
