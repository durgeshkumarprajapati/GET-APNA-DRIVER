import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreference,
  NOTIFICATION_CATEGORIES,
} from '@/modules/notification/application/notification-preference-service';

const updatePreferenceSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
  push: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
});

export const GET = withAuth(async (_req, { principal }) => {
  const preferences = await getUserNotificationPreferences(principal.userId);
  return NextResponse.json({ preferences }, { status: 200 });
});

export const PUT = withAuth(async (req, { principal }) => {
  const body = await req.json();
  const parsed = updatePreferenceSchema.parse(body);

  const updated = await updateUserNotificationPreference(principal.userId, parsed);

  return NextResponse.json({ preference: updated }, { status: 200 });
});
