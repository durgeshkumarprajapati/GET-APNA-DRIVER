import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { getOrCreateCustomerProfile } from '@/modules/customer/application/customer-profile-service';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { SYSTEM_ROLE_CODES } from '../../domain/role-catalog';

export type ProfileCompletionRole = 'ADMINISTRATOR' | 'CUSTOMER' | 'DRIVER' | null;

export interface ProfileCompletionResult {
  isComplete: boolean;
  role: ProfileCompletionRole;
  missingFields: string[];
  nextPath: string;
}

/**
 * The single, server-authoritative source of "is this account ready to use
 * the platform" — reused by the dashboard-redirect-service (which appends
 * this to a URL to land the user in the right place), the Google OAuth
 * callback (indirectly, via the redirect service), the role-selection
 * endpoint (to compute the response destination), and profile pages
 * themselves. Never determined from React state — always a fresh read of
 * the role assignment + role-specific profile row.
 *
 * A user with zero roles (only reachable today via a brand-new Google
 * identity — every other registration path assigns a role immediately) is
 * `role: null`, `isComplete: false`, routed to explicit role selection.
 */
export async function evaluateProfileCompletion(
  roles: string[],
  userId: string,
  db: Db = prisma,
): Promise<ProfileCompletionResult> {
  if (roles.includes(SYSTEM_ROLE_CODES.ADMINISTRATOR)) {
    return {
      isComplete: true,
      role: 'ADMINISTRATOR',
      missingFields: [],
      nextPath: '/admin/mission-dashboard',
    };
  }

  if (roles.includes(SYSTEM_ROLE_CODES.DRIVER)) {
    const profile = await getOrCreateDriverProfile(userId, db);
    const missingFields: string[] = [];
    if (!profile.firstName?.trim()) missingFields.push('firstName');
    if (!profile.lastName?.trim()) missingFields.push('lastName');
    // Onboarding (documents, vehicle, verification) is the authoritative
    // completeness gate for drivers — a driver with a name but who hasn't
    // finished onboarding is still incomplete.
    const onboardingComplete = profile.onboardingStatus === 'COMPLETED';
    const isComplete = missingFields.length === 0 && onboardingComplete;
    return {
      isComplete,
      role: 'DRIVER',
      missingFields: onboardingComplete ? missingFields : [...missingFields, 'onboarding'],
      nextPath: isComplete ? '/driver' : '/driver/onboarding',
    };
  }

  if (roles.includes(SYSTEM_ROLE_CODES.CUSTOMER)) {
    const profile = await getOrCreateCustomerProfile(userId, db);
    const missingFields: string[] = [];
    if (!profile.firstName?.trim()) missingFields.push('firstName');
    if (!profile.lastName?.trim()) missingFields.push('lastName');
    const isComplete = missingFields.length === 0;
    return {
      isComplete,
      role: 'CUSTOMER',
      missingFields,
      nextPath: isComplete ? '/customer/dashboard' : '/profile',
    };
  }

  // No role at all — the only way to reach this state is a brand-new
  // Google identity awaiting explicit role selection.
  return { isComplete: false, role: null, missingFields: ['role'], nextPath: '/auth/select-role' };
}
