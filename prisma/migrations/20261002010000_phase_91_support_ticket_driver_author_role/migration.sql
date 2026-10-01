-- Phase 91's driver-issue-report-service.ts files SupportTicket messages on
-- a driver's own behalf, but SupportTicketAuthorRole had no DRIVER value —
-- the only options were CUSTOMER/SUPPORT_AGENT/SYSTEM, so a driver's own
-- message would have had to be mislabeled as CUSTOMER in the ticket thread.

-- AlterEnum
ALTER TYPE "support_ticket_author_role" ADD VALUE 'DRIVER';
