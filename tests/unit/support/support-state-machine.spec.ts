import { SupportTicketStatus } from '@prisma/client';
import {
  validateTicketStateTransition,
  isTerminalState,
} from '@/modules/support/domain/support-state-machine';
import { InvalidSupportTicketStateTransitionError } from '@/modules/support/domain/errors';

describe('SupportTicket State Machine', () => {
  describe('validateTicketStateTransition', () => {
    it('allows valid transitions from OPEN', () => {
      expect(() =>
        validateTicketStateTransition(SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS),
      ).not.toThrow();
      expect(() =>
        validateTicketStateTransition(
          SupportTicketStatus.OPEN,
          SupportTicketStatus.WAITING_FOR_CUSTOMER,
        ),
      ).not.toThrow();
      expect(() =>
        validateTicketStateTransition(SupportTicketStatus.OPEN, SupportTicketStatus.RESOLVED),
      ).not.toThrow();
      expect(() =>
        validateTicketStateTransition(SupportTicketStatus.OPEN, SupportTicketStatus.CLOSED),
      ).not.toThrow();
    });

    it('allows valid transitions from IN_PROGRESS', () => {
      expect(() =>
        validateTicketStateTransition(
          SupportTicketStatus.IN_PROGRESS,
          SupportTicketStatus.WAITING_FOR_CUSTOMER,
        ),
      ).not.toThrow();
      expect(() =>
        validateTicketStateTransition(
          SupportTicketStatus.IN_PROGRESS,
          SupportTicketStatus.RESOLVED,
        ),
      ).not.toThrow();
      expect(() =>
        validateTicketStateTransition(SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.CLOSED),
      ).not.toThrow();
    });

    it('allows reopening from RESOLVED and CLOSED', () => {
      expect(() =>
        validateTicketStateTransition(SupportTicketStatus.RESOLVED, SupportTicketStatus.REOPENED),
      ).not.toThrow();
      expect(() =>
        validateTicketStateTransition(SupportTicketStatus.CLOSED, SupportTicketStatus.REOPENED),
      ).not.toThrow();
    });

    it('allows no-op transitions (same status)', () => {
      expect(() =>
        validateTicketStateTransition(SupportTicketStatus.OPEN, SupportTicketStatus.OPEN),
      ).not.toThrow();
      expect(() =>
        validateTicketStateTransition(SupportTicketStatus.CLOSED, SupportTicketStatus.CLOSED),
      ).not.toThrow();
    });

    it('disallows invalid transitions', () => {
      expect(() =>
        validateTicketStateTransition(SupportTicketStatus.CLOSED, SupportTicketStatus.IN_PROGRESS),
      ).toThrow(InvalidSupportTicketStateTransitionError);
    });
  });

  describe('isTerminalState', () => {
    it('correctly identifies CLOSED as terminal state', () => {
      expect(isTerminalState(SupportTicketStatus.CLOSED)).toBe(true);
      expect(isTerminalState(SupportTicketStatus.RESOLVED)).toBe(false);
      expect(isTerminalState(SupportTicketStatus.OPEN)).toBe(false);
    });
  });
});
