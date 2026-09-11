import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { SupportTicketAuthorRole, SupportTicketStatus, Prisma } from '@prisma/client';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { SupportTicketNotFoundError, SupportTicketAccessDeniedError } from '../../domain/errors';
import { validateTicketStateTransition } from '../../domain/support-state-machine';
import type {
  ListAdminTicketsQuery,
  AddAdminMessageInput,
  UpdateAdminTicketStatusInput,
  AssignAdminTicketInput,
} from '../../domain/types';

export async function listAdminSupportTickets(query: ListAdminTicketsQuery, db: Db = prisma) {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const whereConditions: Prisma.SupportTicketWhereInput[] = [];

  if (query.status) {
    whereConditions.push({ status: query.status });
  }

  if (query.priority) {
    whereConditions.push({ priority: query.priority });
  }

  if (query.category) {
    whereConditions.push({ category: query.category });
  }

  if (query.assignedAdminId) {
    whereConditions.push({ assignedAdminId: query.assignedAdminId });
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    whereConditions.push({
      OR: [
        { ticketNumber: { contains: term, mode: 'insensitive' } },
        { subject: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        {
          customer: {
            identities: {
              some: {
                OR: [
                  { email: { contains: term, mode: 'insensitive' } },
                  { phoneNumber: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
        {
          customer: {
            customerProfile: {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { displayName: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
      ],
    });
  }

  const where: Prisma.SupportTicketWhereInput =
    whereConditions.length > 0 ? { AND: whereConditions } : {};

  const [tickets, total, openCount, inProgressCount, waitingCount, urgentCount, resolvedCount] =
    await Promise.all([
      db.supportTicket.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        include: {
          customer: {
            select: {
              id: true,
              customerProfile: {
                select: { firstName: true, lastName: true, displayName: true },
              },
              identities: {
                select: { email: true, phoneNumber: true },
              },
            },
          },
          assignedAdmin: {
            select: {
              id: true,
              identities: {
                select: { email: true },
              },
            },
          },
        },
      }),
      db.supportTicket.count({ where }),
      db.supportTicket.count({ where: { status: SupportTicketStatus.OPEN } }),
      db.supportTicket.count({ where: { status: SupportTicketStatus.IN_PROGRESS } }),
      db.supportTicket.count({ where: { status: SupportTicketStatus.WAITING_FOR_CUSTOMER } }),
      db.supportTicket.count({ where: { priority: 'URGENT' } }),
      db.supportTicket.count({ where: { status: SupportTicketStatus.RESOLVED } }),
    ]);

  return {
    tickets,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    metrics: {
      open: openCount,
      inProgress: inProgressCount,
      waiting: waitingCount,
      urgent: urgentCount,
      resolved: resolvedCount,
    },
  };
}

export async function getAdminTicketDetail(ticketId: string, db: Db = prisma) {
  const ticket = await db.supportTicket.findFirst({
    where: {
      OR: [{ id: ticketId }, { ticketNumber: ticketId }],
    },
    include: {
      customer: {
        select: {
          id: true,
          accountStatus: true,
          customerProfile: {
            select: { firstName: true, lastName: true, displayName: true },
          },
          identities: {
            select: { email: true, phoneNumber: true, providerType: true },
          },
        },
      },
      assignedAdmin: {
        select: {
          id: true,
          identities: { select: { email: true } },
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
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          authorUser: {
            select: {
              id: true,
              customerProfile: { select: { firstName: true, lastName: true } },
              identities: { select: { email: true } },
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new SupportTicketNotFoundError(ticketId);
  }

  const auditLogs = await db.auditLog.findMany({
    where: {
      entityType: 'SupportTicket',
      entityId: ticket.id,
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    ticket,
    auditLogs,
  };
}

export async function addAdminMessage(input: AddAdminMessageInput, db: Db = prisma) {
  const ticket = await db.supportTicket.findUnique({
    where: { id: input.ticketId },
  });

  if (!ticket) {
    throw new SupportTicketNotFoundError(input.ticketId);
  }

  const isInternal = Boolean(input.isInternalNote);

  return await db.$transaction(async (tx) => {
    const message = await tx.supportMessage.create({
      data: {
        ticketId: ticket.id,
        authorUserId: input.adminUserId,
        authorRole: SupportTicketAuthorRole.SUPPORT_AGENT,
        isInternalNote: isInternal,
        body: input.body.trim(),
      },
    });

    if (isInternal) {
      await tx.auditLog.create({
        data: {
          actorUserId: input.adminUserId,
          action: 'support.ticket.internal_note_created',
          entityType: 'SupportTicket',
          entityId: ticket.id,
          afterState: { messageId: message.id },
        },
      });
      return message;
    }

    let nextStatus = ticket.status;
    if (
      ticket.status === SupportTicketStatus.OPEN ||
      ticket.status === SupportTicketStatus.IN_PROGRESS ||
      ticket.status === SupportTicketStatus.REOPENED
    ) {
      nextStatus = SupportTicketStatus.WAITING_FOR_CUSTOMER;
      validateTicketStateTransition(ticket.status, nextStatus);
    }

    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        updatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.adminUserId,
        action: 'support.ticket.responded',
        entityType: 'SupportTicket',
        entityId: ticket.id,
        beforeState: { status: ticket.status },
        afterState: { messageId: message.id, status: nextStatus, authorRole: 'SUPPORT_AGENT' },
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
        authorRole: 'SUPPORT_AGENT',
        customerId: ticket.customerId,
        newStatus: nextStatus,
      },
    });

    return message;
  });
}

export async function updateAdminTicketStatus(input: UpdateAdminTicketStatusInput, db: Db = prisma) {
  const ticket = await db.supportTicket.findUnique({
    where: { id: input.ticketId },
  });

  if (!ticket) {
    throw new SupportTicketNotFoundError(input.ticketId);
  }

  validateTicketStateTransition(ticket.status, input.status);

  return await db.$transaction(async (tx) => {
    const resolvedAt =
      input.status === SupportTicketStatus.RESOLVED ? new Date() : ticket.resolvedAt;
    const closedAt =
      input.status === SupportTicketStatus.CLOSED ? new Date() : ticket.closedAt;

    const updated = await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: input.status,
        resolvedAt,
        closedAt,
        updatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.adminUserId,
        action: 'support.ticket.status_changed',
        entityType: 'SupportTicket',
        entityId: ticket.id,
        beforeState: { status: ticket.status },
        afterState: { status: input.status, actorUserId: input.adminUserId },
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
        newStatus: input.status,
        customerId: ticket.customerId,
      },
    });

    return updated;
  });
}

export async function assignAdminTicket(input: AssignAdminTicketInput, db: Db = prisma) {
  const ticket = await db.supportTicket.findUnique({
    where: { id: input.ticketId },
  });

  if (!ticket) {
    throw new SupportTicketNotFoundError(input.ticketId);
  }

  if (input.assignedAdminId) {
    const adminUser = await db.user.findUnique({
      where: { id: input.assignedAdminId },
      select: { id: true, accountStatus: true },
    });
    if (!adminUser) {
      throw new SupportTicketAccessDeniedError('Assigned user not found.');
    }
  }

  return await db.$transaction(async (tx) => {
    const updated = await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        assignedAdminId: input.assignedAdminId,
        updatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.adminUserId,
        action: 'support.ticket.assigned',
        entityType: 'SupportTicket',
        entityId: ticket.id,
        beforeState: { assignedAdminId: ticket.assignedAdminId },
        afterState: { assignedAdminId: input.assignedAdminId },
      },
    });

    return updated;
  });
}
