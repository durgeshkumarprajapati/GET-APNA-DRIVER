import {
  hasPermission,
  hasRole,
  requireAuthenticatedUser,
  requirePermission,
  requireRole,
} from '@/modules/identity/authorization/authorization-service';
import {
  AccountNotActiveError,
  ForbiddenError,
  UnauthenticatedError,
} from '@/modules/identity/domain/errors';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';

const activeCustomer: AuthenticatedPrincipal = {
  userId: 'user-1',
  accountStatus: 'ACTIVE',
  roles: ['CUSTOMER'],
  permissions: ['bookings.read'],
};

describe('requireAuthenticatedUser', () => {
  it('throws UnauthenticatedError for a null principal', () => {
    expect(() => requireAuthenticatedUser(null)).toThrow(UnauthenticatedError);
  });

  it.each(['SUSPENDED', 'DEACTIVATED', 'DELETED'] as const)(
    'throws AccountNotActiveError for a %s account',
    (accountStatus) => {
      expect(() => requireAuthenticatedUser({ ...activeCustomer, accountStatus })).toThrow(
        AccountNotActiveError,
      );
    },
  );

  it.each(['PENDING', 'ACTIVE'] as const)('allows a %s account through', (accountStatus) => {
    const principal = { ...activeCustomer, accountStatus };
    expect(requireAuthenticatedUser(principal)).toEqual(principal);
  });
});

describe('requireRole / requirePermission', () => {
  it('passes when the principal has the role', () => {
    expect(requireRole(activeCustomer, 'CUSTOMER')).toBe(activeCustomer);
  });

  it('throws ForbiddenError when the principal lacks the role', () => {
    expect(() => requireRole(activeCustomer, 'ADMINISTRATOR')).toThrow(ForbiddenError);
  });

  it('passes when the principal has the permission', () => {
    expect(requirePermission(activeCustomer, 'bookings.read')).toBe(activeCustomer);
  });

  it('throws ForbiddenError when the principal lacks the permission', () => {
    expect(() => requirePermission(activeCustomer, 'system.configuration.manage')).toThrow(
      ForbiddenError,
    );
  });

  it('never trusts a claimed role that is not backed by the matching permission', () => {
    // A principal can never legitimately end up like this (buildPrincipal always
    // derives permissions from the same active roles) but the check must still
    // hold on the permission list itself, not on the roles array, so a bug
    // elsewhere can't silently grant access.
    const spoofed: AuthenticatedPrincipal = {
      userId: 'attacker',
      accountStatus: 'ACTIVE',
      roles: ['ADMINISTRATOR'],
      permissions: [],
    };
    expect(() => requirePermission(spoofed, 'system.configuration.manage')).toThrow(ForbiddenError);
  });
});

describe('hasRole / hasPermission', () => {
  it('return booleans without throwing', () => {
    expect(hasRole(activeCustomer, 'CUSTOMER')).toBe(true);
    expect(hasRole(activeCustomer, 'ADMINISTRATOR')).toBe(false);
    expect(hasPermission(activeCustomer, 'bookings.read')).toBe(true);
    expect(hasPermission(activeCustomer, 'bookings.manage')).toBe(false);
  });
});
