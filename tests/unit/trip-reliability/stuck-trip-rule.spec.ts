import { evaluateStuckTrip } from '@/modules/trip-reliability/rules/stuck-trip-rule';

describe('evaluateStuckTrip', () => {
  it('should detect stuck trip when IN_PROGRESS booking exceeds maximum expected duration', () => {
    const input = {
      bookingId: 'b5',
      status: 'IN_PROGRESS',
      updatedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago without state change
      driverProfileId: 'd1',
    };

    const evaluation = evaluateStuckTrip(input);
    expect(evaluation).not.toBeNull();
    expect(evaluation?.detected).toBe(true);
    expect(evaluation?.type).toBe('TRIP_STUCK');
  });

  it('should not detect stuck trip when IN_PROGRESS booking was updated recently', () => {
    const input = {
      bookingId: 'b6',
      status: 'IN_PROGRESS',
      updatedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      driverProfileId: 'd1',
    };

    const evaluation = evaluateStuckTrip(input);
    expect(evaluation).toBeNull();
  });
});
