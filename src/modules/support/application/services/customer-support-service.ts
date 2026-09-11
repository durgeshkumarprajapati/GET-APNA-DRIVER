import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { SupportTicketAuthorRole, SupportTicketStatus } from '@prisma/client';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import {
  SupportTicketNotFoundError,
  SupportTicketAccessDeniedError,
  InvalidBookingAssociationError,
} from '../../domain/errors';
import { validateTicketStateTransition } from '../../domain/support-state-machine';
import type {
  CreateSupportTicketInput,
  ListCustomerTicketsQuery,
  AddCustomerMessageInput,
} from '../../domain/types';

async function generateTicketNumber(tx: Db): Promise<string> {
  const count = await tx.supportTicket.count();
  const seq = (count + 1).toString().padStart(6, '0');
  const candidate = `GAD-${seq}`;
  const existing = await tx.supportTicket.findUnique({ where: { ticketNumber: candidate } });
  if (existing) {
    const timeSeq = Number(process.hrtime.bigint() % BigInt(10000)).toString().padStart(4, '0');
    return `GAD-${count + 1}${timeSeq}`;
  }
  return candidate;
}

export async function createSupportTicket(input: CreateSupportTicketInput, db: Db = prisma) {
  if (input.bookingId) {
    const booking = await db.booking.findUnique({
      where: { id: input.bookingId },
      select: { id: true, customerId: true },
    });
    if (!booking || booking.customerId !== input.customerId) {
      throw new InvalidBookingAssociationError(input.bookingId);
    }
  }

  return await db.$transaction(async (tx) => {
    const ticketNumber = await generateTicketNumber(tx);

    const ticket = await tx.supportTicket.create({
      data: {
        ticketNumber,
        customerId: input.customerId,
        bookingId: input.bookingId || null,
        category: input.category,
        subject: input.subject.trim(),
        description: input.description.trim(),
        status: SupportTicketStatus.OPEN,
        messages: {
          create: {
            authorUserId: input.customerId,
            authorRole: SupportTicketAuthorRole.CUSTOMER,
            isInternalNote: false,
            body: input.description.trim(),
          },
        },
      },
      include: {
        messages: {
          where: { isInternalNote: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.customerId,
        action: 'support.ticket.created',
        entityType: 'SupportTicket',
        entityId: ticket.id,
        afterState: {
          ticketNumber: ticket.ticketNumber,
          category: ticket.category,
          status: ticket.status,
          bookingId: ticket.bookingId,
        },
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'support.ticket_created',
      aggregateType: 'SupportTicket',
      aggregateId: ticket.id,
      payload: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerId: input.customerId,
        category: ticket.category,
        subject: ticket.subject,
      },
    });

    return ticket;
  });
}

export async function listCustomerTickets(query: ListCustomerTicketsQuery, db: Db = prisma) {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where = {
    customerId: query.customerId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [tickets, total] = await Promise.all([
    db.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        ticketNumber: true,
        category: true,
        status: true,
        priority: true,
        subject: true,
        description: true,
        bookingId: true,
        resolvedAt: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.supportTicket.count({ where }),
  ]);

  return {
    tickets,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCustomerTicketDetail(
  ticketId: string,
  customerId: string,
  db: Db = prisma,
) {
  const ticket = await db.supportTicket.findFirst({
    where: {
      OR: [{ id: ticketId }, { ticketNumber: ticketId }],
    },
    include: {
      messages: {
        where: { isInternalNote: false },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          ticketId: true,
          authorUserId: true,
          authorRole: true,
          body: true,
          createdAt: true,
        },
      },
      booking: {
        select: {
          id: true,
          status: true,
          bookingType: true,
          pickupAddress: true,
          dropoffAddress: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new SupportTicketNotFoundError(ticketId);
  }

  if (ticket.customerId !== customerId) {
    throw new SupportTicketAccessDeniedError('You do not have access to this support ticket.');
  }

  return ticket;
}

export async function addCustomerMessage(input: AddCustomerMessageInput, db: Db = prisma) {
  const ticket = await db.supportTicket.findUnique({
    where: { id: input.ticketId },
  });

  if (!ticket) {
    throw new SupportTicketNotFoundError(input.ticketId);
  }

  if (ticket.customerId !== input.customerId) {
    throw new SupportTicketAccessDeniedError('You do not have access to reply to this ticket.');
  }

  let nextStatus = ticket.status;
  if (
    ticket.status === SupportTicketStatus.RESOLVED ||
    ticket.status === SupportTicketStatus.CLOSED
  ) {
    nextStatus = SupportTicketStatus.REOPENED;
  } else if (ticket.status === SupportTicketStatus.WAITING_FOR_CUSTOMER) {
    nextStatus = SupportTicketStatus.IN_PROGRESS;
  }

  if (nextStatus !== ticket.status) {
    validateTicketStateTransition(ticket.status, nextStatus);
  }

  return await db.$transaction(async (tx) => {
    const message = await tx.supportMessage.create({
      data: {
        ticketId: ticket.id,
        authorUserId: input.customerId,
        authorRole: SupportTicketAuthorRole.CUSTOMER,
        isInternalNote: false,
        body: input.body.trim(),
      },
    });

    if (nextStatus !== ticket.status) {
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: nextStatus,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: input.customerId,
          action: 'support.ticket.status_changed',
          entityType: 'SupportTicket',
          entityId: ticket.id,
          beforeState: { status: ticket.status },
          afterState: { status: nextStatus, trigger: 'customer_reply' },
        },
      });

      await insertOutboxEvent(tx, {
        eventType: 'support.ticket_status_changed',
        aggregateType: 'SupportTicket',
        aggregateId: ticket.id,
        payload: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          previousStatus: ticket.status,
          newStatus: nextStatus,
          customerId: ticket.customerId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: input.customerId,
        action: 'support.ticket.responded',
        entityType: 'SupportTicket',
        entityId: ticket.id,
        afterState: { messageId: message.id, authorRole: 'CUSTOMER' },
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'support.ticket_responded',
      aggregateType: 'SupportTicket',
      aggregateId: ticket.id,
      payload: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        messageId: message.id,
        authorRole: 'CUSTOMER',
        customerId: ticket.customerId,
      },
    });

    return message;
  });
}

export async function closeCustomerTicket(ticketId: string, customerId: string, db: Db = prisma) {
  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new SupportTicketNotFoundError(ticketId);
  }

  if (ticket.customerId !== customerId) {
    throw new SupportTicketAccessDeniedError('You do not have access to close this ticket.');
  }

  validateTicketStateTransition(ticket.status, SupportTicketStatus.CLOSED);

  return await db.$transaction(async (tx) => {
    const updated = await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: SupportTicketStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: customerId,
        action: 'support.ticket.closed',
        entityType: 'SupportTicket',
        entityId: ticket.id,
        beforeState: { status: ticket.status },
        afterState: { status: SupportTicketStatus.CLOSED },
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'support.ticket_status_changed',
      aggregateType: 'SupportTicket',
      aggregateId: ticket.id,
      payload: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        previousStatus: ticket.status,
        newStatus: SupportTicketStatus.CLOSED,
        customerId: ticket.customerId,
      },
    });

    return updated;
  });
}
