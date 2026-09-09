import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/shared/config/env';
import { prisma } from '@/shared/database/prisma';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';
import { DriverLayout } from '@/components/driver-layout';

export default async function DriverSectionLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;
  const principal = token ? await getPrincipalFromSessionToken(token) : null;

  // Not role-gated to DRIVER here: /driver/onboarding must stay reachable by
  // an authenticated user who has not been granted the DRIVER role yet (its
  // API route only requires `withAuth`). Each driver-only endpoint enforces
  // its own role/permission server-side.
  if (!principal) {
    redirect('/login');
  }

  const contactInfo = await getContactInfoForUsers(prisma, [principal.userId]);
  const email = contactInfo.get(principal.userId)?.email ?? null;

  return <DriverLayout userEmail={email}>{children}</DriverLayout>;
}
