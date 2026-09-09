import { DisputeCategory, DisputeStatus } from '@prisma/client';
import {
  createDispute,
  updateDisputeStatus,
  resolveDispute,
} from '@/modules/dispute/application/dispute-service';
import { InvalidDisputeStateTransitionError } from '@/modules/dispute/domain/dispute-state-machine';

jest.mock('@/modules/finance/application/services/refund-service', () => ({
  initiateRefund: jest.fn().mockResolvedValue({
    id: 'rfnd_mock_123',
    status: 'PROCESSED',
    amount: '250.0000',
  }),
}));

describe('DisputeService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb: any = {
    $transaction: jest.fn((callback) => callback(mockDb)),
    dispute: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    booking: {
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

  describe('createDispute', () => {
    it('should create a dispute when user is customer of booking', async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: 'bkg-200',
        customerId: 'user-cust-1',
        driverProfile: { userId: 'user-drv-1' },
      });
      mockDb.dispute.findFirst.mockResolvedValue(null);
      mockDb.dispute.create.mockResolvedValue({
        id: 'disp-100',
        disputeNumber: 'DISP-20260909-ABCD',
        bookingId: 'bkg-200',
        raisedByUserId: 'user-cust-1',
        category: DisputeCategory.PAYMENT_ISSUE,
        status: DisputeStatus.OPEN,
        reason: 'Incorrect fare charged',
        createdAt: new Date(),
      });

      const dispute = await createDispute(
        {
          bookingId: 'bkg-200',
          raisedByUserId: 'user-cust-1',
          category: DisputeCategory.PAYMENT_ISSUE,
          reason: 'Incorrect fare charged',
        },
        mockDb,
      );

      expect(dispute.disputeNumber).toContain('DISP-');
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'dispute.created' }),
        }),
      );
      expect(mockDb.outboxEvent.create).toHaveBeenCalled();
    });

    it('should reject dispute creation if user is not customer or driver of the booking', async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: 'bkg-200',
        customerId: 'user-cust-1',
        driverProfile: { userId: 'user-drv-1' },
      });

      await expect(
        createDispute(
          {
            bookingId: 'bkg-200',
            raisedByUserId: 'unauthorized-stranger',
            category: DisputeCategory.PAYMENT_ISSUE,
            reason: 'Malicious attempt',
          },
          mockDb,
        ),
      ).rejects.toThrow('User is not authorized to raise a dispute for this booking');
    });
  });

  describe('updateDisputeStatus', () => {
    it('should allow valid status transitions (OPEN -> UNDER_REVIEW -> RESOLVED)', async () => {
      mockDb.dispute.findUnique.mockResolvedValue({
        id: 'disp-100',
        status: DisputeStatus.OPEN,
        assignedOperatorId: null,
      });

      mockDb.dispute.update.mockResolvedValue({
        id: 'disp-100',
        status: DisputeStatus.UNDER_REVIEW,
      });

      const res = await updateDisputeStatus(
        {
          disputeId: 'disp-100',
          actionUserId: 'admin-1',
          toStatus: DisputeStatus.UNDER_REVIEW,
        },
        mockDb,
      );

      expect(res.status).toBe(DisputeStatus.UNDER_REVIEW);
      expect(mockDb.auditLog.create).toHaveBeenCalled();
    });

    it('should throw InvalidDisputeStateTransitionError for illegal transitions', async () => {
      mockDb.dispute.findUnique.mockResolvedValue({
        id: 'disp-100',
        status: DisputeStatus.CANCELLED,
      });

      await expect(
        updateDisputeStatus(
          {
            disputeId: 'disp-100',
            actionUserId: 'admin-1',
            toStatus: DisputeStatus.ESCALATED,
          },
          mockDb,
        ),
      ).rejects.toThrow(InvalidDisputeStateTransitionError);
    });
  });

  describe('resolveDispute', () => {
    it('should resolve dispute and delegate refund via initiateRefund if refund requested', async () => {
      const disputeObj = {
        id: 'disp-100',
        disputeNumber: 'DISP-20260909-ABCD',
        bookingId: 'bkg-200',
        raisedByUserId: 'user-cust-1',
        status: DisputeStatus.OPEN,
        booking: {
          id: 'bkg-200',
          payments: [{ id: 'pay-100', status: 'CAPTURED', amount: 500 }],
        },
      };

      mockDb.dispute.findUnique.mockResolvedValue(disputeObj);
      mockDb.dispute.update.mockResolvedValue({
        ...disputeObj,
        status: DisputeStatus.RESOLVED,
        resolutionSummary: 'Refunded customer ₹250',
        refundAmountMinorUnits: 25000,
      });

      const res = await resolveDispute(
        {
          disputeId: 'disp-100',
          actionUserId: 'admin-1',
          resolutionSummary: 'Refunded customer ₹250',
          refundAmountMinorUnits: 25000,
        },
        mockDb,
      );

      expect(res.status).toBe(DisputeStatus.RESOLVED);
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'dispute.resolved' }),
        }),
      );
      expect(mockDb.outboxEvent.create).toHaveBeenCalled();
    });
  });
});
