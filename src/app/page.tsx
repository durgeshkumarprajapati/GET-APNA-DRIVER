import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/shared/config/env';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import { resolveDashboardHref } from '@/modules/identity/application/services/dashboard-redirect-service';
import HomeContent from './home-content';

/**
 * A visitor with a still-valid session is sent straight to their
 * role-appropriate dashboard instead of the marketing homepage — checked
 * server-side so there's no flash of marketing content before redirecting.
 * Anyone without a session (or whose session has expired/been logged out)
 * falls through to the real homepage.
 */
export default async function LandingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;
  const principal = token ? await getPrincipalFromSessionToken(token) : null;

  if (principal) {
    redirect(await resolveDashboardHref(principal.roles, principal.userId));
  }

  return <HomeContent />;
}
