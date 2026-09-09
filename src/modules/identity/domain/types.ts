import type { AccountStatus, IdentityProviderType } from '@prisma/client';

export type { AccountStatus, IdentityProviderType };

/**
 * The resolved identity of the current caller, as known to the application
 * layer. This is never trusted from a client request — it must always be
 * derived server-side from validated session/authentication data (see
 * `application/services/principal-service.ts`). Full session resolution is
 * implemented in a later phase; this type is the stable contract that phase
 * will produce and every authorization check consumes.
 */
export interface AuthenticatedPrincipal {
  userId: string;
  accountStatus: AccountStatus;
  /** System role codes currently active for this user (e.g. "CUSTOMER"). */
  roles: string[];
  /** Flattened, deduplicated permission codes granted by those roles. */
  permissions: string[];
}
