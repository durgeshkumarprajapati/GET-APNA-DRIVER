import { SupportTicketStatus } from '@prisma/client';

export class SupportTicketNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Support ticket not found: ${identifier}`);
    this.name = 'SupportTicketNotFoundError';
  }
}

export class InvalidSupportTicketStateTransitionError extends Error {
  constructor(currentStatus: SupportTicketStatus, targetStatus: SupportTicketStatus) {
    super(`Invalid support ticket transition from ${currentStatus} to ${targetStatus}.`);
    this.name = 'InvalidSupportTicketStateTransitionError';
  }
}

export class SupportTicketAccessDeniedError extends Error {
  constructor(message: string = 'Access denied to support ticket.') {
    super(message);
    this.name = 'SupportTicketAccessDeniedError';
  }
}

export class InvalidBookingAssociationError extends Error {
  constructor(bookingId: string) {
    super(`Booking ${bookingId} does not belong to the customer or is invalid.`);
    this.name = 'InvalidBookingAssociationError';
  }
}
