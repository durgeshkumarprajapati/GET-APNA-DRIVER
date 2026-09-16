import { TripEventService } from '@/modules/trip-intelligence/trip-event-service';
import { prisma } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    tripIntelligenceEvent: {
      create: jest.fn(),
    },
  },
}));

describe('TripEventService Idempotency Tests', () => {
  let eventService: TripEventService;

  beforeEach(() => {
    jest.clearAllMocks();
    eventService = new TripEventService();
  });

  it('should generate deterministic fingerprint for same booking, user, and signal', () => {
    const fp1 = eventService.generateFingerprint('b1', 'u1', 'DRIVER_EN_ROUTE');
    const fp2 = eventService.generateFingerprint('b1', 'u1', 'DRIVER_EN_ROUTE');
    const fp3 = eventService.generateFingerprint('b1', 'u1', 'DRIVER_ARRIVED');

    expect(fp1).toBe(fp2);
    expect(fp1).toBe('b1:u1:DRIVER_EN_ROUTE');
    expect(fp1).not.toBe(fp3);
  });

  it('should create event and return true if fingerprint is unique', async () => {
    (prisma.tripIntelligenceEvent.create as jest.Mock).mockResolvedValue({
      id: 'evt_1',
      fingerprint: 'b1:u1:DRIVER_ARRIVED',
    });

    const result = await eventService.recordIntelligenceEvent({
      bookingId: 'b1',
      userId: 'u1',
      actorRole: 'CUSTOMER',
      signalType: 'DRIVER_ARRIVED',
      confidence: 'HIGH',
    });

    expect(result).toBe(true);
    expect(prisma.tripIntelligenceEvent.create).toHaveBeenCalledWith({
      data: {
        bookingId: 'b1',
        userId: 'u1',
        actorRole: 'CUSTOMER',
        signalType: 'DRIVER_ARRIVED',
        confidence: 'HIGH',
        fingerprint: 'b1:u1:DRIVER_ARRIVED',
        metadata: null,
      },
    });
  });

  it('should return false if database throws duplicate constraint error (idempotent duplicate event)', async () => {
    (prisma.tripIntelligenceEvent.create as jest.Mock).mockRejectedValue(
      new Error('Unique constraint failed on fingerprint'),
    );

    const result = await eventService.recordIntelligenceEvent({
      bookingId: 'b1',
      userId: 'u1',
      actorRole: 'CUSTOMER',
      signalType: 'DRIVER_ARRIVED',
      confidence: 'HIGH',
    });

    expect(result).toBe(false);
  });
});
