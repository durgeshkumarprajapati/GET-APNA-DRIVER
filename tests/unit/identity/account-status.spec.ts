import {
  getAllowedAccountStatusTransitions,
  isValidAccountStatusTransition,
} from '@/modules/identity/domain/account-status';

describe('isValidAccountStatusTransition', () => {
  it.each([
    ['PENDING', 'ACTIVE'],
    ['PENDING', 'DEACTIVATED'],
    ['PENDING', 'DELETED'],
    ['ACTIVE', 'SUSPENDED'],
    ['ACTIVE', 'DEACTIVATED'],
    ['ACTIVE', 'DELETED'],
    ['SUSPENDED', 'ACTIVE'],
    ['SUSPENDED', 'DEACTIVATED'],
    ['SUSPENDED', 'DELETED'],
    ['DEACTIVATED', 'ACTIVE'],
    ['DEACTIVATED', 'DELETED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(isValidAccountStatusTransition(from, to)).toBe(true);
  });

  it.each([
    ['PENDING', 'SUSPENDED'],
    ['DELETED', 'ACTIVE'],
    ['DELETED', 'PENDING'],
    ['DEACTIVATED', 'SUSPENDED'],
    ['ACTIVE', 'PENDING'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(isValidAccountStatusTransition(from, to)).toBe(false);
  });

  it('rejects a no-op transition to the same status', () => {
    expect(isValidAccountStatusTransition('ACTIVE', 'ACTIVE')).toBe(false);
  });

  it('treats DELETED as terminal', () => {
    expect(getAllowedAccountStatusTransitions('DELETED')).toEqual([]);
  });
});
