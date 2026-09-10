import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/shared/config/env';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';

/**
 * Minimal server-side "is there a valid session" gate for pages that are
 * legitimately shared across roles — e.g. a booking/payment detail page an
 * assigned driver and its own customer both need to reach — and therefore
 * can't be gated by src/app/customer/layout.tsx or src/app/driver/layout.tsx's
 * role check the way /customer/* and /driver/* are. Object-level ownership
 * for the specific resource is still enforced by the underlying API routes;
 * this only stops the page shell itself from rendering for a fully
 * unauthenticated visitor before those calls 401.
 */
export async function requireSessionForPage(): Promise<AuthenticatedPrincipal> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;
  const principal = token ? await getPrincipalFromSessionToken(token) : null;
  if (!principal) {
    redirect('/login');
  }
  return principal;
}
