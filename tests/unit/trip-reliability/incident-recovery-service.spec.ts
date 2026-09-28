import { IncidentRecoveryService } from '@/modules/trip-reliability/incident-recovery-service';
import { prisma } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    tripReliabilityIncident: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tripReliabilityTimeline: {
      create: jest.fn(),
    },
    tripReliabilityRecoveryAttempt: {
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/modules/trip-reliability/recovery/assignment-recovery', () => ({
  AssignmentRecoveryHandler: jest.fn().mockImplementation(() => ({
    recoverAssignmentTimeout: jest.fn().mockResolvedValue({
      success: true,
      actionTaken: 'RETRY_DISPATCH',
      notes: 'Redispatch triggered successfully.',
    }),
    recoverDriverCancellation: jest.fn(),
  })),
}));

jest.mock('@/modules/trip-reliability/recovery/dispatch-recovery', () => ({
  DispatchRecoveryHandler: jest.fn().mockImplementation(() => ({
    recoverDispatchFailure: jest.fn(),
  })),
}));

jest.mock('@/modules/trip-reliability/recovery/notification-recovery', () => ({
  NotificationRecoveryHandler: jest.fn().mockImplementation(() => ({
    recoverNotificationFailure: jest.fn(),
  })),
}));

jest.mock('@/modules/trip-reliability/recovery/reconciliation-recovery', () => ({
  ReconciliationRecoveryHandler: jest.fn().mockImplementation(() => ({
    recoverInvoiceFailure: jest.fn(),
    recoverPaymentReconciliation: jest.fn(),
  })),
}));

jest.mock('@/modules/trip-reliability/incident-escalation-service', () => ({
  IncidentEscalationService: jest.fn().mockImplementation(() => ({
    escalateIncident: jest.fn().mockResolvedValue({ status: 'ESCALATED' }),
  })),
}));

jest.mock('@/modules/trip-reliability/incident-notification-service', () => ({
  IncidentNotificationService: jest.fn().mockImplementation(() => ({
    notifyCustomerReliabilityEvent: jest.fn().mockResolvedValue(true),
  })),
}));

const baseIncident = (overrides: Record<string, unknown> = {}) => ({
  id: 'inc_201',
  bookingId: 'b201',
  customerId: 'cust_1',
  type: 'ASSIGNMENT_TIMEOUT',
  status: 'INVESTIGATING',
  severity: 'HIGH',
  booking: { id: 'b201', status: 'SEARCHING_DRIVER' },
  ...overrides,
});

describe('IncidentRecoveryService', () => {
  let recoveryService: IncidentRecoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    recoveryService = new IncidentRecoveryService();
    (prisma.tripReliabilityRecoveryAttempt.count as jest.Mock).mockResolvedValue(0);
    (prisma.tripReliabilityRecoveryAttempt.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.tripReliabilityRecoveryAttempt.create as jest.Mock).mockResolvedValue({
      id: 'attempt_1',
    });
    (prisma.tripReliabilityIncident.update as jest.Mock).mockResolvedValue({
      id: 'inc_201',
      status: 'RESOLVED',
    });
  });

  it('executes recovery for a first-attempt ASSIGNMENT_TIMEOUT incident (RESTART_DISPATCH policy)', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(baseIncident());

    const result = await recoveryService.executeRecovery('inc_201', 'admin_1');

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('RETRY_DISPATCH');
    expect(prisma.tripReliabilityRecoveryAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          incidentId: 'inc_201',
          attemptNumber: 1,
          idempotencyKey: 'recovery:inc_201:1',
        }),
      }),
    );
    expect(prisma.tripReliabilityIncident.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inc_201' } }),
    );
  });

  it('returns error if incident does not exist', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await recoveryService.executeRecovery('inc_999');

    expect(result.success).toBe(false);
    expect(result.actionTaken).toBe('INCIDENT_NOT_FOUND');
    expect(prisma.tripReliabilityRecoveryAttempt.create).not.toHaveBeenCalled();
  });

  it('treats an already-resolved incident as a no-op without creating an attempt', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(
      baseIncident({ status: 'RESOLVED' }),
    );

    const result = await recoveryService.executeRecovery('inc_201');

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('ALREADY_RESOLVED');
    expect(prisma.tripReliabilityRecoveryAttempt.create).not.toHaveBeenCalled();
  });

  it('dismisses the incident instead of recovering when the booking has already reached a terminal state', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(
      baseIncident({ booking: { id: 'b201', status: 'CANCELLED' } }),
    );

    const result = await recoveryService.executeRecovery('inc_201');

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('DISMISSED_BOOKING_TERMINAL');
    expect(prisma.tripReliabilityIncident.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DISMISSED' }) }),
    );
    expect(prisma.tripReliabilityRecoveryAttempt.create).not.toHaveBeenCalled();
  });

  it('escalates automatically once the auto-retry limit is exceeded, without another handler call', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(baseIncident());
    // ASSIGNMENT_TIMEOUT policy allows maxAutoRetries: 3 — attemptNumber would be 4.
    (prisma.tripReliabilityRecoveryAttempt.count as jest.Mock).mockResolvedValue(3);

    const result = await recoveryService.executeRecovery('inc_201');

    expect(result.success).toBe(false);
    expect(result.actionTaken).toBe('AUTO_RETRY_LIMIT_EXCEEDED');
    expect(result.escalated).toBe(true);
    // The limit-exceeded path records its own CANCELLED attempt row directly
    // (not through the PROCESSING->handler flow), so this call is the one
    // create() invocation we expect here.
    expect(prisma.tripReliabilityRecoveryAttempt.create).toHaveBeenCalledTimes(1);
    expect(prisma.tripReliabilityRecoveryAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CANCELLED',
          failureCode: 'AUTO_RETRY_LIMIT_EXCEEDED',
        }),
      }),
    );
  });

  it('bypasses the auto-retry limit for a manual (admin-triggered) override', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(baseIncident());
    (prisma.tripReliabilityRecoveryAttempt.count as jest.Mock).mockResolvedValue(10);

    const result = await recoveryService.executeRecovery('inc_201', 'admin_1', {
      isManualOverride: true,
    });

    expect(result.actionTaken).toBe('RETRY_DISPATCH');
    expect(prisma.tripReliabilityRecoveryAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attemptNumber: 11 }) }),
    );
  });

  it('skips recovery while the cooldown window has not elapsed since the last attempt', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(baseIncident());
    (prisma.tripReliabilityRecoveryAttempt.count as jest.Mock).mockResolvedValue(1);
    (prisma.tripReliabilityRecoveryAttempt.findFirst as jest.Mock).mockResolvedValue({
      startedAt: new Date(),
    });

    const result = await recoveryService.executeRecovery('inc_201');

    expect(result.actionTaken).toBe('COOLDOWN_ACTIVE');
    expect(prisma.tripReliabilityIncident.update).not.toHaveBeenCalled();
  });

  it('escalates directly (no handler dispatch) for an ESCALATE_ONLY policy type', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(
      baseIncident({ type: 'TRIP_STUCK' }),
    );

    const result = await recoveryService.executeRecovery('inc_201');

    expect(result.actionTaken).toBe('ESCALATED_PER_POLICY');
    expect(result.escalated).toBe(true);
    expect(prisma.tripReliabilityRecoveryAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCEEDED' }) }),
    );
  });

  it('notifies without escalating for a NOTIFY_ONLY policy type', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(
      baseIncident({ type: 'PICKUP_DELAY' }),
    );

    const result = await recoveryService.executeRecovery('inc_201');

    expect(result.actionTaken).toBe('NOTIFIED_PER_POLICY');
    expect(result.escalated).toBeUndefined();
  });

  it('treats a concurrent duplicate attempt-slot claim as already in progress rather than erroring', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(baseIncident());
    (prisma.tripReliabilityRecoveryAttempt.create as jest.Mock).mockRejectedValue(
      new Error('Unique constraint failed'),
    );

    const result = await recoveryService.executeRecovery('inc_201');

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('RECOVERY_ALREADY_IN_PROGRESS');
  });
});
