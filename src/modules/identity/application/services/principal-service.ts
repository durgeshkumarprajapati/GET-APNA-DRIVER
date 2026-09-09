import 'server-only';
import { prisma } from '@/shared/database/prisma';
import * as userRepository from '../../infrastructure/user-repository';
import * as rbacRepository from '../../infrastructure/rbac-repository';
import type { AuthenticatedPrincipal } from '../../domain/types';

/**
 * Loads the current roles/permissions for a user and assembles an
 * `AuthenticatedPrincipal`. Returns null for a missing or DELETED user — a
 * deleted account should not resolve to a usable principal at all. Every
 * other status (PENDING, ACTIVE, SUSPENDED, DEACTIVATED) resolves to a real
 * principal with its true status, so `authorization-service` can reject it
 * with a specific reason rather than a generic "not found".
 *
 * This is a read; it intentionally does not decide who is allowed to call
 * it — the future session-resolution phase is the only intended caller
 * (given a userId already authenticated via a validated session).
 */
export async function buildPrincipal(userId: string): Promise<AuthenticatedPrincipal | null> {
  const user = await userRepository.findUserById(prisma, userId);
  if (!user || user.accountStatus === 'DELETED') {
    return null;
  }

  const { roleCodes, permissionCodes } = await rbacRepository.loadUserRbacSnapshot(prisma, userId);

  return {
    userId: user.id,
    accountStatus: user.accountStatus,
    roles: roleCodes,
    permissions: permissionCodes,
  };
}

/**
 * Resolves an AuthenticatedPrincipal directly from a raw session token.
 */
export async function getPrincipalFromSessionToken(
  token: string,
): Promise<AuthenticatedPrincipal | null> {
  const { validateSessionToken } = await import('./session-service');
  const validated = await validateSessionToken(token);
  if (!validated) {
    return null;
  }
  return buildPrincipal(validated.user.id);
}
