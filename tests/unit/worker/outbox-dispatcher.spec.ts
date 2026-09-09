import { OutboxDispatcherService } from '@/worker/outbox/outbox-dispatcher-service';
import { eventHandlerRegistry } from '@/worker/outbox/event-handler-registry';
import { OutboxEvent, OutboxEventStatus } from '@prisma/client';

interface MockDb {
  $queryRaw: jest.Mock;
  outboxEvent: {
    update: jest.Mock;
  };
  systemConfiguration: {
    findUnique: jest.Mock;
  };
}

describe('OutboxDispatcherService', () => {
  let dispatcher: OutboxDispatcherService;
  let mockDb: MockDb;

  beforeEach(() => {
    dispatcher = new OutboxDispatcherService('test-worker-1');
    eventHandlerRegistry.clear();

    mockDb = {
      $queryRaw: jest.fn(),
      outboxEvent: {
        update: jest.fn(),
      },
      systemConfiguration: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
  });

  it('claims pending outbox events using atomic DB query', async () => {
    const mockEvents = [
      {
        id: 'event-1',
        eventType: 'booking.created',
        aggregateType: 'Booking',
        aggregateId: 'booking-123',
        payload: { bookingId: 'booking-123', customerId: 'cust-1' },
        status: OutboxEventStatus.PROCESSING,
        attempts: 1,
      },
    ];

    mockDb.$queryRaw.mockResolvedValue(mockEvents);

    const claimed = await dispatcher.claimEvents(
      10,
      300,
      mockDb as unknown as Parameters<typeof dispatcher.claimEvents>[2],
    );

    expect(claimed).toEqual(mockEvents);
    expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('processes event successfully and marks as PROCESSED', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    eventHandlerRegistry.register('booking.created', handler);

    const event = {
      id: 'event-100',
      eventType: 'booking.created',
      aggregateType: 'Booking',
      aggregateId: 'booking-1',
      payload: { bookingId: 'booking-1' },
      status: OutboxEventStatus.PROCESSING,
      attempts: 1,
      availableAt: new Date(),
      lastAttemptAt: null,
      lockedAt: new Date(),
      lockedBy: 'test-worker-1',
      lastError: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as OutboxEvent;

    mockDb.outboxEvent.update.mockResolvedValue({ ...event, status: OutboxEventStatus.PROCESSED });

    const success = await dispatcher.processEvent(
      event,
      { maxAttempts: 5 },
      mockDb as unknown as Parameters<typeof dispatcher.processEvent>[2],
    );

    expect(success).toBe(true);
    expect(handler).toHaveBeenCalledWith(
      event,
      { bookingId: 'booking-1' },
      mockDb as unknown as Parameters<typeof dispatcher.processEvent>[2],
    );
    expect(mockDb.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-100' },
      data: expect.objectContaining({
        status: OutboxEventStatus.PROCESSED,
      }),
    });
  });

  it('schedules retry with exponential backoff on transient failure', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('Transient DB timeout'));
    eventHandlerRegistry.register('payment.captured', handler);

    const event = {
      id: 'event-200',
      eventType: 'payment.captured',
      aggregateType: 'Payment',
      aggregateId: 'pay-1',
      payload: { paymentId: 'pay-1' },
      status: OutboxEventStatus.PROCESSING,
      attempts: 1,
      availableAt: new Date(),
      lastAttemptAt: null,
      lockedAt: new Date(),
      lockedBy: 'test-worker-1',
      lastError: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as OutboxEvent;

    mockDb.outboxEvent.update.mockResolvedValue({ ...event, status: OutboxEventStatus.PENDING });

    const success = await dispatcher.processEvent(
      event,
      { maxAttempts: 5, initialRetryDelaySeconds: 10 },
      mockDb as unknown as Parameters<typeof dispatcher.processEvent>[2],
    );

    expect(success).toBe(false);
    expect(mockDb.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-200' },
      data: expect.objectContaining({
        status: OutboxEventStatus.PENDING,
        lastError: 'Transient DB timeout',
      }),
    });
  });

  it('marks event as FAILED when max attempts threshold is reached', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('Fatal schema mismatch'));
    eventHandlerRegistry.register('user.created', handler);

    const event = {
      id: 'event-300',
      eventType: 'user.created',
      aggregateType: 'User',
      aggregateId: 'usr-1',
      payload: { userId: 'usr-1' },
      status: OutboxEventStatus.PROCESSING,
      attempts: 5, // max attempts
      availableAt: new Date(),
      lastAttemptAt: null,
      lockedAt: new Date(),
      lockedBy: 'test-worker-1',
      lastError: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as OutboxEvent;

    mockDb.outboxEvent.update.mockResolvedValue({ ...event, status: OutboxEventStatus.FAILED });

    const success = await dispatcher.processEvent(
      event,
      { maxAttempts: 5 },
      mockDb as unknown as Parameters<typeof dispatcher.processEvent>[2],
    );

    expect(success).toBe(false);
    expect(mockDb.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-300' },
      data: expect.objectContaining({
        status: OutboxEventStatus.FAILED,
        lastError: 'Fatal schema mismatch',
      }),
    });
  });
});
