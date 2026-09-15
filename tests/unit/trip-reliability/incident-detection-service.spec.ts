import { IncidentDetectionService } from '@/modules/trip-reliability/incident-detection-service';
import { prisma } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    safetyIncident: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    tripReliabilityIncident: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    tripReliabilityTimeline: {
      create: jest.fn(),
    },
  },
}));

describe('IncidentDetectionService', () => {
  let detectionService: IncidentDetectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    detectionService = new IncidentDetectionService();
  });

  it('should detect assignment timeout when booking remains searching driver past threshold', async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const mockIncident = {
      id: 'inc_101',
      bookingId: 'b101',
      type: 'ASSIGNMENT_TIMEOUT',
      status: 'DETECTED',
      severity: 'MEDIUM',
    };

    (prisma.tripReliabilityIncident.create as jest.Mock).mockResolvedValue(mockIncident);

    const result = await detectionService.evaluateBookingReliability({
      bookingId: 'b101',
      status: 'SEARCHING_DRIVER',
      createdAt: tenMinutesAgo,
      customerId: 'cust_1',
    });

    expect(result).not.toBeNull();
    expect(result?.type).toBe('ASSIGNMENT_TIMEOUT');
    expect(prisma.tripReliabilityIncident.create).toHaveBeenCalled();
  });

  it('should return null when no rules are triggered', async () => {
    const result = await detectionService.evaluateBookingReliability({
      bookingId: 'b102',
      status: 'SEARCHING_DRIVER',
      createdAt: new Date(), // recent
      customerId: 'cust_1',
    });

    expect(result).toBeNull();
    expect(prisma.tripReliabilityIncident.create).not.toHaveBeenCalled();
  });
});
