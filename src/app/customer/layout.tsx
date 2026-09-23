import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/shared/config/env';
import { prisma } from '@/shared/database/prisma';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { CustomerLayout } from '@/components/customer-layout';

export default async function CustomerSectionLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;
  const principal = token ? await getPrincipalFromSessionToken(token) : null;

  if (!principal || !principal.roles.includes(SYSTEM_ROLE_CODES.CUSTOMER)) {
    redirect('/login');
  }

  const contactInfo = await getContactInfoForUsers(prisma, [principal.userId]);
  const profile = await prisma.customerProfile.findUnique({
    where: { userId: principal.userId },
    select: { displayName: true, firstName: true, lastName: true },
  });
  const name =
    profile?.displayName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
    contactInfo.get(principal.userId)?.email ||
    'Customer';

  return <CustomerLayout userEmail={name}>{children}</CustomerLayout>;
}
