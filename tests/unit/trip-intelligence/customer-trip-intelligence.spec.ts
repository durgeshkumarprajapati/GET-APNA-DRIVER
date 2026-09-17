import { CustomerTripIntelligence } from '@/modules/trip-intelligence/customer/customer-trip-intelligence';
import { prisma } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: {
      findFirst: jest.fn(),
    },
    safetyIncident: {
      findFirst: jest.fn(),
    },
    tripIntelligenceEvent: {
      create: jest.fn().mockResolvedValue({ id: 'evt_1' }),
    },
  },
}));

jest.mock('@/modules/location/application/booking-location-service', () => ({
  getCustomerBookingLocationTelemetry: jest.fn().mockResolvedValue({
    driverLocation: {
      latitude: 22.31,
      longitude: 73.185,
      capturedAt: new Date(),
    },
  }),
}));

describe('CustomerTripIntelligence Orchestrator Tests', () => {
  let customerIntelligence: CustomerTripIntelligence;

  beforeEach(() => {
    jest.clearAllMocks();
    customerIntelligence = new CustomerTripIntelligence();
  });

  it('should return trip intelligence for active customer booking', async () => {
    (prisma.booking.findFirst as jest.Mock).mockResolvedValue({
      id: 'b1',
      status: 'ASSIGNED',
      pickupAddress: 'Vadodara Station',
      pickupLatitude: 22.3072,
      pickupLongitude: 73.1812,
      dropoffAddress: 'Alkapuri Mall',
      dropoffLatitude: 22.315,
      dropoffLongitude: 73.2,
      driverEnRouteAt: new Date(),
      driverArrivedAt: null,
      tripStartedAt: null,
      tripCompletedAt: null,
      finalFareAmount: null,
    });

    (prisma.safetyIncident.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await customerIntelligence.getCustomerTripIntelligence('c1', 'b1');

    expect(result).not.toBeNull();
    expect(result?.bookingId).toBe('b1');
    expect(result?.signalType).toBe('DRIVER_NEAR_PICKUP');
    expect(result?.freshness).toBe('LIVE');
    expect(result?.actions.some((a) => a.type === 'SHOW_MAP')).toBe(true);
  });

  it('should return null if booking does not exist or does not belong to customer', async () => {
    (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await customerIntelligence.getCustomerTripIntelligence('c1', 'invalid_booking');

    expect(result).toBeNull();
  });
});
