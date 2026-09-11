import {
  SupportTicketCategory,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketAuthorRole,
} from '@prisma/client';

export interface CreateSupportTicketInput {
  customerId: string;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  bookingId?: string | null;
}

export interface ListCustomerTicketsQuery {
  customerId: string;
  status?: SupportTicketStatus;
  page?: number;
  pageSize?: number;
}

export interface AddCustomerMessageInput {
  customerId: string;
  ticketId: string;
  body: string;
}

export interface ListAdminTicketsQuery {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
  assignedAdminId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AddAdminMessageInput {
  adminUserId: string;
  ticketId: string;
  body: string;
  isInternalNote?: boolean;
}

export interface UpdateAdminTicketStatusInput {
  adminUserId: string;
  ticketId: string;
  status: SupportTicketStatus;
}

export interface AssignAdminTicketInput {
  adminUserId: string;
  ticketId: string;
  assignedAdminId: string | null;
}

export interface PublicSupportMessageDTO {
  id: string;
  ticketId: string;
  authorUserId: string;
  authorRole: SupportTicketAuthorRole;
  body: string;
  createdAt: Date;
}

export interface AdminSupportMessageDTO extends PublicSupportMessageDTO {
  isInternalNote: boolean;
  authorName?: string;
}
