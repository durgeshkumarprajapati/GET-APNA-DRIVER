import { DriverTripIntelligence } from '@/modules/trip-intelligence/driver/driver-trip-intelligence';
import { prisma } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverProfile: {
      findUnique: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
    },
    safetyIncident: {
      findFirst: jest.fn(),
    },
    driverIncentiveProgress: {
      findFirst: jest.fn(),
    },
    tripIntelligenceEvent: {
      create: jest.fn().mockResolvedValue({ id: 'evt_1' }),
    },
  },
}));

jest.mock('@/modules/location/application/booking-location-service', () => ({
  getDriverBookingLocationTelemetry: jest.fn().mockResolvedValue({
    driverLocation: {
      latitude: 22.3075,
      longitude: 73.1813,
      capturedAt: new Date(),
    },
  }),
}));

describe('DriverTripIntelligence Orchestrator Tests', () => {
  let driverIntelligence: DriverTripIntelligence;

  beforeEach(() => {
    jest.clearAllMocks();
    driverIntelligence = new DriverTripIntelligence();
  });

  it('should return trip intelligence for assigned driver booking', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'dp1',
      userId: 'd1',
    });

    (prisma.booking.findFirst as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'ASSIGNED',
      pickupAddress: 'Vadodara Station',
      pickupLatitude: 22.3072,
      pickupLongitude: 73.1812,
      dropoffAddress: 'Alkapuri Mall',
      driverEnRouteAt: new Date(),
      driverArrivedAt: null,
      tripStartedAt: null,
      tripCompletedAt: null,
    });

    (prisma.safetyIncident.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await driverIntelligence.getDriverTripIntelligence('d1', 'b1');

    expect(result).not.toBeNull();
    expect(result?.bookingId).toBe('b1');
    expect(result?.signalType).toBe('DRIVER_NEAR_PICKUP');
    expect(result?.actions.some((a) => a.type === 'SHOW_MAP')).toBe(true);
  });

  it('should return null if driver profile does not exist', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await driverIntelligence.getDriverTripIntelligence('d1', 'b1');

    expect(result).toBeNull();
  });
});
