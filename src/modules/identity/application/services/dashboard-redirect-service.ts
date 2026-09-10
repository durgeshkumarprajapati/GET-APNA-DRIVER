import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { evaluateProfileCompletion } from './profile-completion-service';

/**
 * The single, server-authoritative place that decides where an
 * authenticated session lands — used by the root landing page (a visitor
 * with a live session) and consumed identically after every login path
 * (OTP, email/password, Google) since each of those just hard-navigates to
 * `/` and lets this resolve the destination. Never driven by anything the
 * client claims about its own role.
 *
 * Authoritative for: authentication → role → onboarding state → profile
 * completeness → dashboard destination. The actual completeness rules
 * (what counts as a finished profile per role, and where an incomplete one
 * gets routed) live in profile-completion-service.ts, which this delegates
 * to entirely — kept as a thin wrapper so callers that only need "where do
 * I go" (this function) and callers that need the full structured
 * completion state (role-selection endpoint, profile pages) share one
 * implementation rather than two.
 *
 * A driver who hasn't finished onboarding is always sent to
 * /driver/onboarding instead of the driver dashboard — the same
 * destination registration itself already redirects a brand-new driver to,
 * kept true on every subsequent login too, not only the first one. A
 * roleless session (a brand-new Google identity awaiting role selection)
 * is sent to /auth/select-role.
 */
export async function resolveDashboardHref(
  roles: string[],
  userId: string,
  db: Db = prisma,
): Promise<string> {
  const completion = await evaluateProfileCompletion(roles, userId, db);
  return completion.nextPath;
}
