import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ThemePreference } from '@prisma/client';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  getOrCreateCustomerPreference,
  updateCustomerPreference,
} from '@/modules/customer/application/customer-preference-service';

const updatePreferenceSchema = z.object({
  theme: z.nativeEnum(ThemePreference).optional(),
  language: z.string().optional(),
  pushNotificationsEnabled: z.boolean().optional(),
  smsNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});

export const GET = withAuth(async (_req, { principal }) => {
  const preferences = await getOrCreateCustomerPreference(principal.userId);
  return NextResponse.json({ preferences }, { status: 200 });
});

export const PUT = withAuth(async (req, { principal }) => {
  const body = await req.json();
  const parsed = updatePreferenceSchema.parse(body);

  const updated = await updateCustomerPreference(principal.userId, parsed, {
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ preferences: updated }, { status: 200 });
});
