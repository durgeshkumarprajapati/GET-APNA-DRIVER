import {
  isTerminalSettlementStatus,
  validateSettlementStatusTransition,
} from '@/modules/finance/domain/settlement-state-machine';
import { InvalidSettlementStatusTransitionError } from '@/modules/finance/domain/errors';

describe('validateSettlementStatusTransition', () => {
  it.each([
    ['PENDING', 'PROCESSING'],
    ['PENDING', 'CANCELLED'],
    ['PROCESSING', 'PAID'],
    ['PROCESSING', 'FAILED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(() => validateSettlementStatusTransition(from, to)).not.toThrow();
  });

  it('never allows PENDING -> PAID directly (no uncontrolled "mark paid")', () => {
    expect(() => validateSettlementStatusTransition('PENDING', 'PAID')).toThrow(
      InvalidSettlementStatusTransitionError,
    );
  });

  it.each([
    ['PAID', 'PROCESSING'],
    ['FAILED', 'PROCESSING'],
    ['CANCELLED', 'PROCESSING'],
  ] as const)('rejects %s -> %s (terminal states)', (from, to) => {
    expect(() => validateSettlementStatusTransition(from, to)).toThrow(
      InvalidSettlementStatusTransitionError,
    );
  });
});

describe('isTerminalSettlementStatus', () => {
  it.each(['PAID', 'FAILED', 'CANCELLED'] as const)('%s is terminal', (status) => {
    expect(isTerminalSettlementStatus(status)).toBe(true);
  });

  it.each(['PENDING', 'PROCESSING'] as const)('%s is not terminal', (status) => {
    expect(isTerminalSettlementStatus(status)).toBe(false);
  });
});
