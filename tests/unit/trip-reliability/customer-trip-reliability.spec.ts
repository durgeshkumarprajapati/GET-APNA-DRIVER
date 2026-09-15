import { TripReliabilityService } from '@/modules/trip-reliability/trip-reliability-service';
import { prisma } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    safetyIncident: {
      findFirst: jest.fn(),
    },
    tripReliabilityIncident: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
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
        id: 'b_cust_1',
        customerId: 'cust_1',
        status: 'SEARCHING_DRIVER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      telemetry: null,
      paymentState: { paymentCaptured: false, hasTaxInvoice: false },
    }),
  })),
}));

describe('Customer Trip Reliability Integration', () => {
  let service: TripReliabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TripReliabilityService();
  });

  it('should return reliability status and customer reassurance message for active booking', async () => {
    (prisma.tripReliabilityIncident.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await service.getCustomerReliabilityView('cust_1', 'b_cust_1');

    expect(result).not.toBeNull();
    expect(result?.bookingId).toBe('b_cust_1');
    expect(result?.hasActiveIncident).toBe(false);
    expect(result?.statusTitle).toBeDefined();
    expect(result?.statusExplanation).toBeDefined();
  });
});
