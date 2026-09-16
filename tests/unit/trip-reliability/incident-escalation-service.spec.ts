import { IncidentEscalationService } from '@/modules/trip-reliability/incident-escalation-service';
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

describe('IncidentEscalationService', () => {
  let escalationService: IncidentEscalationService;

  beforeEach(() => {
    jest.clearAllMocks();
    escalationService = new IncidentEscalationService();
  });

  it('should escalate an incident to ESCALATED status with human intervention required', async () => {
    (prisma.tripReliabilityIncident.findUnique as jest.Mock).mockResolvedValue({
      id: 'inc_301',
      bookingId: 'b301',
      type: 'SAFETY_ESCALATION',
      status: 'INVESTIGATING',
      severity: 'CRITICAL',
    });

    (prisma.tripReliabilityIncident.update as jest.Mock).mockResolvedValue({
      id: 'inc_301',
      status: 'ESCALATED',
      escalatedAt: new Date(),
    });

    const result = await escalationService.escalateIncident(
      'inc_301',
      'admin_1',
      'Critical safety trigger',
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe('ESCALATED');
    expect(prisma.tripReliabilityIncident.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inc_301' },
        data: expect.objectContaining({
          status: 'ESCALATED',
        }),
      }),
    );
    expect(prisma.tripReliabilityTimeline.create).toHaveBeenCalled();
  });
});
