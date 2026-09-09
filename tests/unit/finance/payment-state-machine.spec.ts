import {
  isTerminalPaymentStatus,
  validatePaymentStatusTransition,
} from '@/modules/finance/domain/payment-state-machine';
import { InvalidPaymentStatusTransitionError } from '@/modules/finance/domain/errors';

describe('validatePaymentStatusTransition', () => {
  it.each([
    ['CREATED', 'PROCESSING'],
    ['CREATED', 'FAILED'],
    ['CREATED', 'CANCELLED'],
    ['PROCESSING', 'CAPTURED'],
    ['PROCESSING', 'FAILED'],
    ['CAPTURED', 'PARTIALLY_REFUNDED'],
    ['CAPTURED', 'REFUNDED'],
    ['PARTIALLY_REFUNDED', 'PARTIALLY_REFUNDED'],
    ['PARTIALLY_REFUNDED', 'REFUNDED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(() => validatePaymentStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    ['CREATED', 'CAPTURED'],
    ['CAPTURED', 'PROCESSING'],
    ['FAILED', 'CAPTURED'],
    ['CANCELLED', 'PROCESSING'],
    ['REFUNDED', 'CAPTURED'],
    ['REFUNDED', 'PARTIALLY_REFUNDED'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(() => validatePaymentStatusTransition(from, to)).toThrow(
      InvalidPaymentStatusTransitionError,
    );
  });

  it('rejects a no-op transition on a non-refund status', () => {
    expect(() => validatePaymentStatusTransition('CAPTURED', 'CAPTURED')).toThrow(
      InvalidPaymentStatusTransitionError,
    );
  });
});

describe('isTerminalPaymentStatus', () => {
  it.each(['FAILED', 'CANCELLED', 'REFUNDED'] as const)('%s is terminal', (status) => {
    expect(isTerminalPaymentStatus(status)).toBe(true);
  });

  it.each(['CREATED', 'PROCESSING', 'CAPTURED', 'PARTIALLY_REFUNDED'] as const)(
    '%s is not terminal',
    (status) => {
      expect(isTerminalPaymentStatus(status)).toBe(false);
    },
  );
});
