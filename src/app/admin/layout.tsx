import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/shared/config/env';
import { prisma } from '@/shared/database/prisma';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { AdminLayout } from '@/components/admin-layout';

export default async function AdminSectionLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;
  const principal = token ? await getPrincipalFromSessionToken(token) : null;

  if (!principal || !principal.roles.includes(SYSTEM_ROLE_CODES.ADMINISTRATOR)) {
    redirect('/login');
  }

  const contactInfo = await getContactInfoForUsers(prisma, [principal.userId]);
  const email = contactInfo.get(principal.userId)?.email ?? null;

  return <AdminLayout userEmail={email}>{children}</AdminLayout>;
}
