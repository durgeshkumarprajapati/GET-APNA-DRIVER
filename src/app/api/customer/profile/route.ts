import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  getOwnCustomerProfileWithContact,
  updateCustomerProfile,
} from '@/modules/customer/application/customer-profile-service';

const updateProfileSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional().or(z.literal('')),
  dateOfBirth: z.string().nullable().optional(),
});

export const GET = withAuth(async (_req, { principal }) => {
  const profile = await getOwnCustomerProfileWithContact(principal.userId);
  return NextResponse.json({ profile }, { status: 200 });
});

export const PUT = withAuth(async (req, { principal }) => {
  const body = await req.json();
  const parsed = updateProfileSchema.parse(body);

  const updated = await updateCustomerProfile(
    principal.userId,
    {
      ...parsed,
      avatarUrl: parsed.avatarUrl === '' ? null : parsed.avatarUrl,
    },
    { ipAddress: req.headers.get('x-forwarded-for') },
  );

  return NextResponse.json({ profile: updated }, { status: 200 });
});
