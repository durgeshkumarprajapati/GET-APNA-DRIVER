import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { recordAuditLog } from '@/shared/audit/audit-service';
import {
  getOrCreateCustomerProfile,
  updateCustomerProfile,
} from '@/modules/customer/application/customer-profile-service';
import {
  getOrCreateDriverProfile,
  updateDriverProfile,
} from '@/modules/driver/application/services/driver-profile-service';
import * as rbacRepository from '../../infrastructure/rbac-repository';
import { SYSTEM_ROLE_CODES } from '../../domain/role-catalog';
import { InvalidRoleSelectionError, RoleAlreadyAssignedError } from '../../domain/errors';
import {
  evaluateProfileCompletion,
  type ProfileCompletionResult,
} from './profile-completion-service';

/**
 * The only two roles selectable through this endpoint. ADMINISTRATOR is
 * deliberately not a member of this type at all — not filtered out, not
 * checked against a denylist, simply impossible to express here. This is
 * what guarantees a client can never self-grant admin access through role
 * selection; see also the service-layer InvalidRoleSelectionError check
 * below (defense in depth against a caller that bypasses the type, e.g. a
 * hand-crafted request).
 */
export type SelectableRole = 'CUSTOMER' | 'DRIVER';

export interface GoogleProfileHint {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

/**
 * Assigns a role to a session that currently has none — the only such
 * session today is a brand-new Google identity (see
 * handleGoogleOAuthCallback). Rejects outright if the account already has
 * any role: this makes the endpoint impossible to use to change an
 * existing role, replay a stale selection, or escalate privileges, since
 * every other registration path (phone OTP, email/password) assigns a
 * role immediately and can never reach this function at all.
 *
 * Role assignment + profile initialization is the atomic, critical step
 * (one transaction). Applying the optional Google-derived name/avatar hint
 * is a separate, best-effort step afterwards — it reuses
 * updateCustomerProfile/updateDriverProfile exactly as the self-service
 * profile pages do (including their own audit log + outbox event), which
 * each open their own transaction; nesting that inside this function's own
 * transaction is deliberately avoided. If prefilling the hint fails for any
 * reason, the user still has a valid role and an (empty) profile — they can
 * fill it in manually via /profile or /driver/onboarding exactly like a
 * phone-registered user already does, which is a safe degradation rather
 * than a half-created account.
 */
export async function selectRoleForUser(
  userId: string,
  role: string,
  profileHint: GoogleProfileHint | null,
  requestMetadata?: Record<string, unknown> | null,
  db: Db = prisma,
): Promise<ProfileCompletionResult> {
  if (role !== SYSTEM_ROLE_CODES.CUSTOMER && role !== SYSTEM_ROLE_CODES.DRIVER) {
    throw new InvalidRoleSelectionError(role);
  }
  const selectedRole: SelectableRole = role;

  await db.$transaction(async (tx: Db) => {
    const currentRoles = await tx.userRole.findMany({
      where: { userId, revokedAt: null },
    });
    if (currentRoles.length > 0) {
      throw new RoleAlreadyAssignedError();
    }

    const roleRecord = await rbacRepository.findRoleByCode(tx, selectedRole);
    if (!roleRecord) {
      // Seed data invariant violation — the role catalog always seeds
      // CUSTOMER/DRIVER/ADMINISTRATOR. Not a user-facing input error.
      throw new Error(`Role ${selectedRole} is not seeded`);
    }
    await rbacRepository.upsertRoleAssignment(tx, {
      userId,
      roleId: roleRecord.id,
      assignedBy: null,
    });

    if (selectedRole === SYSTEM_ROLE_CODES.DRIVER) {
      await getOrCreateDriverProfile(userId, tx);
    } else {
      await getOrCreateCustomerProfile(userId, tx);
    }

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'identity.role_selected',
      entityType: 'User',
      entityId: userId,
      beforeState: { role: null },
      afterState: { role: selectedRole },
      requestMetadata: requestMetadata ?? null,
    });
  });

  // Best-effort prefill from Google's verified identity data. Google
  // authenticates the identity; it does not own this profile going
  // forward — every later read/write goes through the same profile
  // services phone/email users already use, so a subsequent Google login
  // never overwrites anything the user edits here or afterwards.
  const hasHint = profileHint?.firstName || profileHint?.lastName || profileHint?.avatarUrl;
  if (hasHint) {
    try {
      if (selectedRole === SYSTEM_ROLE_CODES.DRIVER) {
        await updateDriverProfile(
          userId,
          {
            firstName: profileHint.firstName,
            lastName: profileHint.lastName,
            profileImageUrl: profileHint.avatarUrl,
          },
          requestMetadata ?? null,
        );
      } else {
        await updateCustomerProfile(
          userId,
          {
            firstName: profileHint.firstName,
            lastName: profileHint.lastName,
            avatarUrl: profileHint.avatarUrl,
          },
          requestMetadata ?? null,
        );
      }
    } catch (err: unknown) {
      logger.warn({ err, userId }, 'Failed to prefill profile from Google identity hint');
    }
  }

  return evaluateProfileCompletion([selectedRole], userId, db);
}
