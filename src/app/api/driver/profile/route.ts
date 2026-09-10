import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import {
  getOwnDriverProfileWithContact,
  updateDriverProfile,
} from '@/modules/driver/application/services/driver-profile-service';

const updateProfileSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional().or(z.literal('')),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  drivingExperienceYears: z.number().int().min(0).optional(),
  primaryServiceArea: z.string().nullable().optional(),
});

export const GET = withRole(SYSTEM_ROLE_CODES.DRIVER, async (_req, { principal }) => {
  const profile = await getOwnDriverProfileWithContact(principal.userId);
  return NextResponse.json({ profile }, { status: 200 });
});

export const PUT = withRole(SYSTEM_ROLE_CODES.DRIVER, async (req, { principal }) => {
  const body = await req.json();
  const parsed = updateProfileSchema.parse(body);

  const updated = await updateDriverProfile(
    principal.userId,
    {
      ...parsed,
      profileImageUrl: parsed.profileImageUrl === '' ? null : parsed.profileImageUrl,
    },
    { ipAddress: req.headers.get('x-forwarded-for') },
  );

  return NextResponse.json({ profile: updated }, { status: 200 });
});
