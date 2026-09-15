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
  },
}));

jest.mock('@/modules/trip-reliability/recovery/assignment-recovery', () => ({
  AssignmentRecoveryHandler: jest.fn().mockImplementation(() => ({
    recoverAssignmentTimeout: jest.fn().mockResolvedValue({
      success: true,
      actionTaken: 'RETRY_DISPATCH',
      notes: 'Redispatch triggered successfully.',
    }),
  })),
}));

describe('IncidentRecoveryService', () => {
  let recoveryService: IncidentRecoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    recoveryService = new IncidentRecoveryService();
  });

  it('should execute recovery for ASSIGNMENT_TIMEOUT incident', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue({
      id: 'inc_201',
      bookingId: 'b201',
      type: 'ASSIGNMENT_TIMEOUT',
      status: 'INVESTIGATING',
      severity: 'HIGH',
    });

    (prisma.tripReliabilityIncident.update as jest.Mock).mockResolvedValue({
      id: 'inc_201',
      status: 'RESOLVED',
    });

    const result = await recoveryService.executeRecovery('inc_201', 'admin_1');

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('RETRY_DISPATCH');
    expect(prisma.tripReliabilityIncident.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inc_201' },
      })
    );
  });

  it('should return error if incident does not exist', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await recoveryService.executeRecovery('inc_999');

    expect(result.success).toBe(false);
    expect(result.actionTaken).toBe('INCIDENT_NOT_FOUND');
  });
});
