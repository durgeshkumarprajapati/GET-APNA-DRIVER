import { SafetyIncidentStatus, SafetyIncidentSeverity, SafetyIncidentType } from '@prisma/client';
import {
  triggerSos,
  updateSafetyIncidentStatus,
  assignSafetyOperator,
} from '@/modules/safety/application/safety-incident-service';
import { InvalidSafetyStateTransitionError } from '@/modules/safety/domain/safety-state-machine';

describe('SafetyIncidentService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb: any = {
    $transaction: jest.fn((callback) => callback(mockDb)),
    safetyIncident: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
    driverCurrentLocation: {
      findUnique: jest.fn(),
    },
    customerCurrentLocation: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerSos', () => {
    it('should create a new SOS safety incident with location snapshot and audit logs', async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: 'bkg-100',
        customerId: 'user-cust-1',
        driverProfileId: 'drv-prof-1',
      });
      mockDb.safetyIncident.findFirst.mockResolvedValue(null);
      mockDb.safetyIncident.create.mockResolvedValue({
        id: 'inc-100',
        incidentNumber: 'SOS-20260909-1234',
        type: SafetyIncidentType.SOS_EMERGENCY,
        severity: SafetyIncidentSeverity.CRITICAL,
        status: SafetyIncidentStatus.OPEN,
        reporterUserId: 'user-cust-1',
        customerId: 'user-cust-1',
        driverProfileId: 'drv-prof-1',
        bookingId: 'bkg-100',
        latitude: 19.076,
        longitude: 72.8777,
        createdAt: new Date(),
        timelineEntries: [],
      });

      const result = await triggerSos(
        {
          reporterUserId: 'user-cust-1',
          bookingId: 'bkg-100',
          latitude: 19.076,
          longitude: 72.8777,
          description: 'Emergency assistance required',
        },
        mockDb,
      );

      expect(result.incidentNumber).toContain('SOS-');
      expect(mockDb.safetyIncident.create).toHaveBeenCalled();
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'safety.sos.triggered',
        }),
      });
      expect(mockDb.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'safety.incident.created',
          }),
        }),
      );
    });

    it('should deduplicate rapid repeated SOS requests within 5 minutes for the same booking', async () => {
      const recentIncident = {
        id: 'inc-existing-1',
        incidentNumber: 'SOS-20260909-0001',
        reporterUserId: 'user-cust-1',
        bookingId: 'bkg-100',
        createdAt: new Date(),
      };

      mockDb.booking.findUnique.mockResolvedValue({
        id: 'bkg-100',
        customerId: 'user-cust-1',
        driverProfileId: 'drv-prof-1',
      });
      mockDb.safetyIncident.findFirst.mockResolvedValue(recentIncident);

      const result = await triggerSos(
        {
          reporterUserId: 'user-cust-1',
          bookingId: 'bkg-100',
          latitude: 19.076,
          longitude: 72.8777,
        },
        mockDb,
      );

      expect(result).toEqual(recentIncident);
      expect(mockDb.safetyIncident.create).not.toHaveBeenCalled();
    });
  });

  describe('updateSafetyIncidentStatus', () => {
    it('should allow valid status transitions (OPEN -> ACKNOWLEDGED -> INVESTIGATING -> RESOLVED)', async () => {
      mockDb.safetyIncident.findUnique.mockResolvedValue({
        id: 'inc-100',
        status: SafetyIncidentStatus.OPEN,
        assignedOperatorId: null,
      });

      mockDb.safetyIncident.update.mockResolvedValue({
        id: 'inc-100',
        status: SafetyIncidentStatus.ACKNOWLEDGED,
      });

      const updated = await updateSafetyIncidentStatus(
        {
          incidentId: 'inc-100',
          actionUserId: 'admin-1',
          toStatus: SafetyIncidentStatus.ACKNOWLEDGED,
          assignedOperatorId: 'admin-1',
        },
        mockDb,
      );

      expect(updated.status).toBe(SafetyIncidentStatus.ACKNOWLEDGED);
      expect(mockDb.auditLog.create).toHaveBeenCalled();
    });

    it('should throw InvalidSafetyStateTransitionError for invalid status transitions', async () => {
      mockDb.safetyIncident.findUnique.mockResolvedValue({
        id: 'inc-100',
        status: SafetyIncidentStatus.RESOLVED,
      });

      await expect(
        updateSafetyIncidentStatus(
          {
            incidentId: 'inc-100',
            actionUserId: 'admin-1',
            toStatus: SafetyIncidentStatus.ACKNOWLEDGED,
          },
          mockDb,
        ),
      ).rejects.toThrow(InvalidSafetyStateTransitionError);
    });
  });

  describe('assignSafetyOperator', () => {
    it('should assign operator and transition state from OPEN to ACKNOWLEDGED', async () => {
      mockDb.safetyIncident.findUnique.mockResolvedValue({
        id: 'inc-100',
        status: SafetyIncidentStatus.OPEN,
        acknowledgedAt: null,
      });

      mockDb.safetyIncident.update.mockResolvedValue({
        id: 'inc-100',
        assignedOperatorId: 'admin-op-1',
        status: SafetyIncidentStatus.ACKNOWLEDGED,
      });

      const res = await assignSafetyOperator(
        {
          incidentId: 'inc-100',
          assignedOperatorId: 'admin-op-1',
          assignedByUserId: 'admin-lead-1',
        },
        mockDb,
      );

      expect(res.assignedOperatorId).toBe('admin-op-1');
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'safety.incident.assigned' }),
        }),
      );
    });
  });
});
