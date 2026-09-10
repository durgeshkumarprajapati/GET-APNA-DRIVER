import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { SYSTEM_ROLE_CODES } from '../../domain/role-catalog';

/**
 * The single, server-authoritative place that decides where an
 * authenticated session lands — used by the root landing page (a visitor
 * with a live session) and consumed identically after every login path
 * (OTP, email/password, Google) since each of those just hard-navigates to
 * `/` and lets this resolve the destination. Never driven by anything the
 * client claims about its own role.
 *
 * A driver who hasn't finished onboarding is always sent to
 * /driver/onboarding instead of the driver dashboard — the same
 * destination registration itself already redirects a brand-new driver to,
 * kept true on every subsequent login too, not only the first one.
 */
export async function resolveDashboardHref(
  roles: string[],
  userId: string,
  db: Db = prisma,
): Promise<string> {
  if (roles.includes(SYSTEM_ROLE_CODES.ADMINISTRATOR)) {
    return '/admin/mission-dashboard';
  }
  if (roles.includes(SYSTEM_ROLE_CODES.DRIVER)) {
    const profile = await db.driverProfile.findUnique({
      where: { userId },
      select: { onboardingStatus: true },
    });
    if (profile && profile.onboardingStatus !== 'COMPLETED') {
      return '/driver/onboarding';
    }
    return '/driver';
  }
  return '/customer/dashboard';
}
