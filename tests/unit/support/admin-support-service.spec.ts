import { SupportTicketStatus, SupportTicketAuthorRole } from '@prisma/client';
import { type Db } from '@/shared/database/prisma';
import {
  listAdminSupportTickets,
  getAdminTicketDetail,
  addAdminMessage,
  updateAdminTicketStatus,
  assignAdminTicket,
} from '@/modules/support/application/services/admin-support-service';
import { SupportTicketNotFoundError } from '@/modules/support/domain/errors';

const mockTx = {
  supportTicket: {
    update: jest.fn(),
  },
  supportMessage: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  outboxEvent: {
    create: jest.fn(),
  },
};

const mockDb = {
  $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
  supportTicket: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));

describe('Admin Support Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAdminSupportTickets', () => {
    it('returns tickets and metrics', async () => {
      mockDb.supportTicket.findMany.mockResolvedValue([]);
      mockDb.supportTicket.count.mockResolvedValue(0);

      const result = await listAdminSupportTickets({}, mockDb as unknown as Db);
      expect(result).toHaveProperty('tickets');
      expect(result).toHaveProperty('metrics');
      expect(result.metrics).toHaveProperty('open');
    });
  });

  describe('getAdminTicketDetail', () => {
    it('returns ticket with all messages including internal notes and audit logs', async () => {
      const mockDetail = {
        id: 'tkt-1',
        ticketNumber: 'GAD-000001',
        messages: [
          { id: 'm1', isInternalNote: false, body: 'Customer issue' },
          { id: 'm2', isInternalNote: true, body: 'Internal note: checked logs' },
        ],
      };
      mockDb.supportTicket.findFirst.mockResolvedValue(mockDetail);
      mockDb.auditLog.findMany.mockResolvedValue([{ id: 'aud-1', action: 'support.ticket.created' }]);

      const res = await getAdminTicketDetail('tkt-1', mockDb as unknown as Db);
      expect(res.ticket).toEqual(mockDetail);
      expect(res.auditLogs).toHaveLength(1);
    });

    it('throws SupportTicketNotFoundError when ticket missing', async () => {
      mockDb.supportTicket.findFirst.mockResolvedValue(null);
      await expect(getAdminTicketDetail('missing-id', mockDb as unknown as Db)).rejects.toThrow(SupportTicketNotFoundError);
    });
  });

  describe('addAdminMessage', () => {
    it('creates public response and transitions status to WAITING_FOR_CUSTOMER', async () => {
      mockDb.supportTicket.findUnique.mockResolvedValue({
        id: 'tkt-1',
        ticketNumber: 'GAD-000001',
        customerId: 'cust-1',
        status: SupportTicketStatus.OPEN,
      });

      const messageObj = {
        id: 'msg-adm-1',
        ticketId: 'tkt-1',
        authorUserId: 'admin-1',
        authorRole: SupportTicketAuthorRole.SUPPORT_AGENT,
        isInternalNote: false,
        body: 'We are looking into your issue.',
      };
      mockTx.supportMessage.create.mockResolvedValue(messageObj);

      const res = await addAdminMessage(
        {
          adminUserId: 'admin-1',
          ticketId: 'tkt-1',
          body: 'We are looking into your issue.',
          isInternalNote: false,
        },
        mockDb as unknown as Db,
      );

      expect(mockTx.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SupportTicketStatus.WAITING_FOR_CUSTOMER }),
        }),
      );
      expect(res).toEqual(messageObj);
    });

    it('creates internal note without updating ticket status or customer outbox event', async () => {
      mockDb.supportTicket.findUnique.mockResolvedValue({
        id: 'tkt-1',
        ticketNumber: 'GAD-000001',
        customerId: 'cust-1',
        status: SupportTicketStatus.OPEN,
      });

      const noteObj = {
        id: 'note-1',
        ticketId: 'tkt-1',
        authorUserId: 'admin-1',
        authorRole: SupportTicketAuthorRole.SUPPORT_AGENT,
        isInternalNote: true,
        body: 'Private fraud investigation note',
      };
      mockTx.supportMessage.create.mockResolvedValue(noteObj);

      const res = await addAdminMessage(
        {
          adminUserId: 'admin-1',
          ticketId: 'tkt-1',
          body: 'Private fraud investigation note',
          isInternalNote: true,
        },
        mockDb as unknown as Db,
      );

      expect(mockTx.supportTicket.update).not.toHaveBeenCalled();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'support.ticket.internal_note_created' }),
        }),
      );
      expect(res).toEqual(noteObj);
    });
  });

  describe('updateAdminTicketStatus', () => {
    it('updates status and logs audit event', async () => {
      mockDb.supportTicket.findUnique.mockResolvedValue({
        id: 'tkt-1',
        ticketNumber: 'GAD-000001',
        customerId: 'cust-1',
        status: SupportTicketStatus.IN_PROGRESS,
      });

      mockTx.supportTicket.update.mockResolvedValue({
        id: 'tkt-1',
        status: SupportTicketStatus.RESOLVED,
      });

      const res = await updateAdminTicketStatus(
        {
          adminUserId: 'admin-1',
          ticketId: 'tkt-1',
          status: SupportTicketStatus.RESOLVED,
        },
        mockDb as unknown as Db,
      );

      expect(mockTx.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SupportTicketStatus.RESOLVED }),
        }),
      );
      expect(res.status).toBe(SupportTicketStatus.RESOLVED);
    });
  });

  describe('assignAdminTicket', () => {
    it('assigns operator successfully', async () => {
      mockDb.supportTicket.findUnique.mockResolvedValue({
        id: 'tkt-1',
        assignedAdminId: null,
      });

      mockDb.user.findUnique.mockResolvedValue({
        id: 'admin-op-2',
        accountStatus: 'ACTIVE',
      });

      mockTx.supportTicket.update.mockResolvedValue({
        id: 'tkt-1',
        assignedAdminId: 'admin-op-2',
      });

      const res = await assignAdminTicket(
        {
          adminUserId: 'admin-1',
          ticketId: 'tkt-1',
          assignedAdminId: 'admin-op-2',
        },
        mockDb as unknown as Db,
      );

      expect(res.assignedAdminId).toBe('admin-op-2');
    });
  });
});
