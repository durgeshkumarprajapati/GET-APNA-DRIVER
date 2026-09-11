import { CallStatus } from '@prisma/client';
import {
  validateCallStateTransition,
  isCallTerminalState,
} from '@/modules/calling/domain/call-state-machine';
import { InvalidCallStateTransitionError } from '@/modules/calling/domain/errors';

describe('CallSession State Machine', () => {
  describe('validateCallStateTransition', () => {
    it('allows valid transitions from REQUESTED', () => {
      expect(() =>
        validateCallStateTransition(CallStatus.REQUESTED, CallStatus.INITIATED),
      ).not.toThrow();
      expect(() =>
        validateCallStateTransition(CallStatus.REQUESTED, CallStatus.FAILED),
      ).not.toThrow();
    });

    it('allows valid transitions from INITIATED', () => {
      expect(() =>
        validateCallStateTransition(CallStatus.INITIATED, CallStatus.RINGING),
      ).not.toThrow();
      expect(() =>
        validateCallStateTransition(CallStatus.INITIATED, CallStatus.ANSWERED),
      ).not.toThrow();
      expect(() =>
        validateCallStateTransition(CallStatus.INITIATED, CallStatus.COMPLETED),
      ).not.toThrow();
      expect(() =>
        validateCallStateTransition(CallStatus.INITIATED, CallStatus.FAILED),
      ).not.toThrow();
      expect(() =>
        validateCallStateTransition(CallStatus.INITIATED, CallStatus.CANCELLED),
      ).not.toThrow();
    });

    it('allows valid transitions from RINGING', () => {
      expect(() =>
        validateCallStateTransition(CallStatus.RINGING, CallStatus.ANSWERED),
      ).not.toThrow();
      expect(() =>
        validateCallStateTransition(CallStatus.RINGING, CallStatus.COMPLETED),
      ).not.toThrow();
    });

    it('allows valid transitions from ANSWERED', () => {
      expect(() =>
        validateCallStateTransition(CallStatus.ANSWERED, CallStatus.COMPLETED),
      ).not.toThrow();
      expect(() =>
        validateCallStateTransition(CallStatus.ANSWERED, CallStatus.FAILED),
      ).not.toThrow();
    });

    it('allows idempotent no-op transitions (same status)', () => {
      expect(() =>
        validateCallStateTransition(CallStatus.INITIATED, CallStatus.INITIATED),
      ).not.toThrow();
      expect(() =>
        validateCallStateTransition(CallStatus.COMPLETED, CallStatus.COMPLETED),
      ).not.toThrow();
    });

    it('disallows invalid transitions from terminal states', () => {
      expect(() =>
        validateCallStateTransition(CallStatus.COMPLETED, CallStatus.ANSWERED),
      ).toThrow(InvalidCallStateTransitionError);
      expect(() =>
        validateCallStateTransition(CallStatus.FAILED, CallStatus.RINGING),
      ).toThrow(InvalidCallStateTransitionError);
    });
  });

  describe('isCallTerminalState', () => {
    it('correctly identifies terminal states', () => {
      expect(isCallTerminalState(CallStatus.COMPLETED)).toBe(true);
      expect(isCallTerminalState(CallStatus.FAILED)).toBe(true);
      expect(isCallTerminalState(CallStatus.CANCELLED)).toBe(true);
      expect(isCallTerminalState(CallStatus.INITIATED)).toBe(false);
      expect(isCallTerminalState(CallStatus.RINGING)).toBe(false);
      expect(isCallTerminalState(CallStatus.ANSWERED)).toBe(false);
    });
  });
});
