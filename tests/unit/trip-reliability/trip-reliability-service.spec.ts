import { TripReliabilityService } from '@/modules/trip-reliability/trip-reliability-service';
import { prisma } from '@/shared/database/prisma';
import { ForbiddenError, NotFoundError } from '@/shared/errors/app-error';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverProfile: { findUnique: jest.fn() },
    tripReliabilityIncident: { findUnique: jest.fn(), update: jest.fn() },
    tripReliabilityTimeline: { create: jest.fn() },
    tripReliabilityRecoveryAttempt: { count: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/shared/realtime/realtime-provider', () => ({
  realtime: { publishBookingUpdate: jest.fn() },
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

describe('TripReliabilityService.recordDriverConfirmation', () => {
  let service: TripReliabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TripReliabilityService();
    (prisma.tripReliabilityRecoveryAttempt.count as jest.Mock).mockResolvedValue(0);
    (prisma.tripReliabilityRecoveryAttempt.create as jest.Mock).mockResolvedValue({ id: 'a1' });
    (prisma.tripReliabilityIncident.update as jest.Mock).mockResolvedValue({ status: 'RESOLVED' });
  });

  const mockDriverAndIncident = (incidentOverrides: Record<string, unknown> = {}) => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'drv_1' });
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue({
      id: 'inc_1',
      bookingId: 'b1',
      customerId: 'cust_1',
      type: 'PICKUP_DELAY',
      severity: 'MEDIUM',
      status: 'DETECTED',
      booking: { id: 'b1', driverProfileId: 'drv_1' },
      ...incidentOverrides,
    });
  };

  it('rejects a driver with no profile at all', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.recordDriverConfirmation('driver_user_1', 'inc_1', 'ARRIVED'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects when the incident does not exist', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'drv_1' });
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.recordDriverConfirmation('driver_user_1', 'inc_missing', 'ARRIVED'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects a driver who is not assigned to the incident booking (IDOR protection)', async () => {
    mockDriverAndIncident({ booking: { id: 'b1', driverProfileId: 'someone_else' } });

    await expect(
      service.recordDriverConfirmation('driver_user_1', 'inc_1', 'ARRIVED'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects when the incident belongs to a different booking than the one in the URL', async () => {
    mockDriverAndIncident();

    await expect(
      service.recordDriverConfirmation('driver_user_1', 'inc_1', 'ARRIVED', 'a-different-booking'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('resolves the incident on ARRIVED and never touches booking status directly', async () => {
    mockDriverAndIncident();

    const result = await service.recordDriverConfirmation('driver_user_1', 'inc_1', 'ARRIVED');

    expect(result.actionTaken).toBe('RESOLVED');
    expect(prisma.tripReliabilityIncident.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'RESOLVED' }) }),
    );
    // Only the incident model was touched — no booking.update call exists on
    // this mocked prisma client at all, so any attempt to set booking status
    // would have thrown "is not a function" rather than silently no-op'ing.
  });

  it('escalates on UNABLE_TO_CONTINUE', async () => {
    mockDriverAndIncident();

    const result = await service.recordDriverConfirmation(
      'driver_user_1',
      'inc_1',
      'UNABLE_TO_CONTINUE',
    );

    expect(result.actionTaken).toBe('ESCALATED');
  });

  it('acknowledges without resolving on TEMPORARILY_DELAYED', async () => {
    mockDriverAndIncident();

    const result = await service.recordDriverConfirmation(
      'driver_user_1',
      'inc_1',
      'TEMPORARILY_DELAYED',
    );

    expect(result.actionTaken).toBe('ACKNOWLEDGED');
    expect(prisma.tripReliabilityIncident.update).not.toHaveBeenCalled();
  });

  it('treats a response to an already-resolved incident as a benign no-op', async () => {
    mockDriverAndIncident({ status: 'RESOLVED' });

    const result = await service.recordDriverConfirmation('driver_user_1', 'inc_1', 'ARRIVED');

    expect(result.actionTaken).toBe('ALREADY_RESOLVED');
    expect(prisma.tripReliabilityRecoveryAttempt.create).not.toHaveBeenCalled();
  });

  it('treats a concurrent duplicate submission as already recorded rather than erroring', async () => {
    mockDriverAndIncident();
    (prisma.tripReliabilityRecoveryAttempt.create as jest.Mock).mockRejectedValue(
      new Error('unique violation'),
    );

    const result = await service.recordDriverConfirmation('driver_user_1', 'inc_1', 'ARRIVED');

    expect(result.actionTaken).toBe('ALREADY_RECORDED');
  });
});

describe('TripReliabilityService.dismissIncident', () => {
  let service: TripReliabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TripReliabilityService();
  });

  it('returns null when the incident does not exist', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await service.dismissIncident('missing', 'admin_1', 'not a real issue');

    expect(result).toBeNull();
  });

  it('marks the incident DISMISSED with the operator-supplied reason recorded on the timeline', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue({
      id: 'inc_1',
      status: 'DETECTED',
    });
    (prisma.tripReliabilityIncident.update as jest.Mock).mockResolvedValue({
      id: 'inc_1',
      status: 'DISMISSED',
    });

    const result = await service.dismissIncident(
      'inc_1',
      'admin_1',
      'False alarm, driver arrived fine.',
    );

    expect(result?.status).toBe('DISMISSED');
    expect(prisma.tripReliabilityTimeline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'INCIDENT_DISMISSED_FALSE_POSITIVE',
          notes: 'False alarm, driver arrived fine.',
        }),
      }),
    );
  });
});
