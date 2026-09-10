import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/shared/config/env';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import { evaluateProfileCompletion } from '@/modules/identity/application/services/profile-completion-service';
import HomeContent from './home-content';

/**
 * A visitor with a still-valid session is sent straight to their
 * role-appropriate dashboard instead of the marketing homepage — checked
 * server-side so there's no flash of marketing content before redirecting.
 * Anyone without a session (or whose session has expired/been logged out)
 * falls through to the real homepage.
 *
 * Calls evaluateProfileCompletion directly (rather than going through
 * dashboard-redirect-service's resolveDashboardHref) so this one query
 * result can both pick the destination AND decide whether to flag it
 * `?profileIncomplete=1` — the signal /profile and /driver/onboarding use
 * to show a one-time "your profile isn't complete yet" toast right after
 * a fresh login, without a second round-trip.
 */
export default async function LandingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;
  const principal = token ? await getPrincipalFromSessionToken(token) : null;

  if (principal) {
    const completion = await evaluateProfileCompletion(principal.roles, principal.userId);
    const suffix = !completion.isComplete && completion.role ? '?profileIncomplete=1' : '';
    redirect(`${completion.nextPath}${suffix}`);
  }

  return <HomeContent />;
}
