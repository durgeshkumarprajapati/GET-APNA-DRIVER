import { TripReliabilityService } from '@/modules/trip-reliability/trip-reliability-service';
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
    tripReliabilityIncident: {
      findFirst: jest.fn(),
    },
    tripReliabilityTimeline: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/modules/trip-reliability/incident-context-service', () => ({
  IncidentContextService: jest.fn().mockImplementation(() => ({
    assembleContext: jest.fn().mockResolvedValue({
      booking: {
        id: 'b_drv_1',
        driverProfileId: 'dp_1',
        status: 'DRIVER_ARRIVED',
        createdAt: new Date(),
        updatedAt: new Date(),
        driverArrivedAt: new Date(Date.now() - 5 * 60 * 1000),
      },
      telemetry: null,
      paymentState: { paymentCaptured: false, hasTaxInvoice: false },
    }),
  })),
}));

describe('Driver Trip Reliability Integration', () => {
  let service: TripReliabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TripReliabilityService();
  });

  it('should return reliability guidance for driver assigned booking', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'dp_1',
      userId: 'driver_user_1',
    });

    (prisma.booking.findFirst as jest.Mock).mockResolvedValue({
      id: 'b_drv_1',
      driverProfileId: 'dp_1',
      status: 'DRIVER_ARRIVED',
      customerId: 'cust_1',
    });

    (prisma.tripReliabilityIncident.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await service.getDriverReliabilityView('driver_user_1', 'b_drv_1');

    expect(result).not.toBeNull();
    expect(result?.bookingId).toBe('b_drv_1');
    expect(result?.hasActiveIncident).toBe(false);
    expect(result?.statusTitle).toBeDefined();
  });
});
