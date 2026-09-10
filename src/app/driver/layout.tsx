import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/shared/config/env';
import { prisma } from '@/shared/database/prisma';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { DriverLayout } from '@/components/driver-layout';

export default async function DriverSectionLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;
  const principal = token ? await getPrincipalFromSessionToken(token) : null;

  // Role-gated to DRIVER, matching src/app/customer/layout.tsx and
  // src/app/admin/layout.tsx. Every path that can reach /driver/onboarding
  // (self-registration, Google role selection, admin role assignment)
  // assigns the DRIVER role BEFORE ever redirecting here — there is no
  // legitimate "authenticated but roleless" driver-portal visitor, so a
  // plain auth-only check previously left this whole segment reachable by
  // any authenticated Customer.
  if (!principal || !principal.roles.includes(SYSTEM_ROLE_CODES.DRIVER)) {
    redirect('/login');
  }

  const contactInfo = await getContactInfoForUsers(prisma, [principal.userId]);
  const email = contactInfo.get(principal.userId)?.email ?? null;

  return <DriverLayout userEmail={email}>{children}</DriverLayout>;
}
