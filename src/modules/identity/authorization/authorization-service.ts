import { AccountNotActiveError, ForbiddenError, UnauthenticatedError } from '../domain/errors';
import type { AccountStatus, AuthenticatedPrincipal } from '../domain/types';

/**
 * Server-side authorization checks. Every function here takes an already
 * -resolved `AuthenticatedPrincipal` (or null) — it never reads a role or
 * user id off the request itself. Resolving that principal from a real
 * session is a later phase's job (see AuthenticatedPrincipal); these checks
 * are what that phase, and every domain service after it, calls to enforce
 * access control. Never trust a client-supplied role or permission value.
 */

const BLOCKED_STATUSES: readonly AccountStatus[] = ['SUSPENDED', 'DEACTIVATED', 'DELETED'];

export function requireAuthenticatedUser(
  principal: AuthenticatedPrincipal | null,
): AuthenticatedPrincipal {
  if (!principal) {
    throw new UnauthenticatedError();
  }
  if (BLOCKED_STATUSES.includes(principal.accountStatus)) {
    throw new AccountNotActiveError(principal.accountStatus);
  }
  return principal;
}

export function hasRole(principal: AuthenticatedPrincipal, roleCode: string): boolean {
  return principal.roles.includes(roleCode);
}

export function hasPermission(principal: AuthenticatedPrincipal, permissionCode: string): boolean {
  return principal.permissions.includes(permissionCode);
}

export function requireRole(
  principal: AuthenticatedPrincipal | null,
  roleCode: string,
): AuthenticatedPrincipal {
  const authenticated = requireAuthenticatedUser(principal);
  if (!hasRole(authenticated, roleCode)) {
    throw new ForbiddenError(`Requires role: ${roleCode}`);
  }
  return authenticated;
}

export function requirePermission(
  principal: AuthenticatedPrincipal | null,
  permissionCode: string,
): AuthenticatedPrincipal {
  const authenticated = requireAuthenticatedUser(principal);
  if (!hasPermission(authenticated, permissionCode)) {
    throw new ForbiddenError(`Requires permission: ${permissionCode}`);
  }
  return authenticated;
}
