import { SupportTicketCategory, SupportTicketStatus, SupportTicketAuthorRole } from '@prisma/client';
import { type Db } from '@/shared/database/prisma';
import {
  createSupportTicket,
  getCustomerTicketDetail,
  addCustomerMessage,
  closeCustomerTicket,
} from '@/modules/support/application/services/customer-support-service';
import {
  SupportTicketNotFoundError,
  SupportTicketAccessDeniedError,
  InvalidBookingAssociationError,
} from '@/modules/support/domain/errors';

const mockTx = {
  supportTicket: {
    count: jest.fn().mockResolvedValue(0),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
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
  booking: {
    findUnique: jest.fn(),
  },
  supportTicket: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));

describe('Customer Support Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSupportTicket', () => {
    it('creates ticket successfully for valid customer request', async () => {
      const createdTicket = {
        id: 'tkt-1',
        ticketNumber: 'GAD-000001',
        customerId: 'cust-1',
        category: SupportTicketCategory.BOOKING_ISSUE,
        status: SupportTicketStatus.OPEN,
        subject: 'Late driver',
        description: 'Driver was 20 minutes late',
      };
      mockTx.supportTicket.create.mockResolvedValue(createdTicket);

      const result = await createSupportTicket(
        {
          customerId: 'cust-1',
          category: SupportTicketCategory.BOOKING_ISSUE,
          subject: 'Late driver',
          description: 'Driver was 20 minutes late',
        },
        mockDb as unknown as Db,
      );

      expect(mockTx.supportTicket.create).toHaveBeenCalled();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'support.ticket.created' }),
        }),
      );
      expect(result).toEqual(createdTicket);
    });

    it('rejects booking association if booking belongs to another customer', async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: 'bk-99',
        customerId: 'other-cust',
      });

      await expect(
        createSupportTicket(
          {
            customerId: 'cust-1',
            category: SupportTicketCategory.BOOKING_ISSUE,
            subject: 'Fake booking association',
            description: 'Trying to link another user booking',
            bookingId: 'bk-99',
          },
          mockDb as unknown as Db,
        ),
      ).rejects.toThrow(InvalidBookingAssociationError);
    });
  });

  describe('getCustomerTicketDetail', () => {
    it('returns detail if ticket belongs to requesting customer', async () => {
      const mockTicket = {
        id: 'tkt-1',
        ticketNumber: 'GAD-000001',
        customerId: 'cust-1',
        subject: 'My ticket',
        messages: [],
      };
      mockDb.supportTicket.findFirst.mockResolvedValue(mockTicket);

      const res = await getCustomerTicketDetail('tkt-1', 'cust-1', mockDb as unknown as Db);
      expect(res).toEqual(mockTicket);
    });

    it('throws SupportTicketAccessDeniedError if customer does not own ticket', async () => {
      mockDb.supportTicket.findFirst.mockResolvedValue({
        id: 'tkt-1',
        ticketNumber: 'GAD-000001',
        customerId: 'other-customer',
      });

      await expect(
        getCustomerTicketDetail('tkt-1', 'attacker-cust', mockDb as unknown as Db),
      ).rejects.toThrow(SupportTicketAccessDeniedError);
    });

    it('throws SupportTicketNotFoundError if ticket does not exist', async () => {
      mockDb.supportTicket.findFirst.mockResolvedValue(null);

      await expect(
        getCustomerTicketDetail('nonexistent', 'cust-1', mockDb as unknown as Db),
      ).rejects.toThrow(SupportTicketNotFoundError);
    });
  });

  describe('addCustomerMessage', () => {
    it('allows customer to reply to own active ticket', async () => {
      mockDb.supportTicket.findUnique.mockResolvedValue({
        id: 'tkt-1',
        customerId: 'cust-1',
        status: SupportTicketStatus.WAITING_FOR_CUSTOMER,
      });

      const messageObj = {
        id: 'msg-1',
        ticketId: 'tkt-1',
        authorUserId: 'cust-1',
        authorRole: SupportTicketAuthorRole.CUSTOMER,
        body: 'Here is more information',
      };
      mockTx.supportMessage.create.mockResolvedValue(messageObj);

      const res = await addCustomerMessage(
        {
          customerId: 'cust-1',
          ticketId: 'tkt-1',
          body: 'Here is more information',
        },
        mockDb as unknown as Db,
      );

      expect(mockTx.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SupportTicketStatus.IN_PROGRESS }),
        }),
      );
      expect(res).toEqual(messageObj);
    });

    it('prevents replying to another customer ticket', async () => {
      mockDb.supportTicket.findUnique.mockResolvedValue({
        id: 'tkt-1',
        customerId: 'victim-cust',
        status: SupportTicketStatus.OPEN,
      });

      await expect(
        addCustomerMessage(
          {
            customerId: 'attacker-cust',
            ticketId: 'tkt-1',
            body: 'Malicious reply',
          },
          mockDb as unknown as Db,
        ),
      ).rejects.toThrow(SupportTicketAccessDeniedError);
    });
  });

  describe('closeCustomerTicket', () => {
    it('allows customer to close their own ticket', async () => {
      mockDb.supportTicket.findUnique.mockResolvedValue({
        id: 'tkt-1',
        customerId: 'cust-1',
        status: SupportTicketStatus.RESOLVED,
      });

      mockTx.supportTicket.update.mockResolvedValue({
        id: 'tkt-1',
        status: SupportTicketStatus.CLOSED,
      });

      const res = await closeCustomerTicket('tkt-1', 'cust-1', mockDb as unknown as Db);
      expect(mockTx.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SupportTicketStatus.CLOSED }),
        }),
      );
      expect(res.status).toBe(SupportTicketStatus.CLOSED);
    });
  });
});
