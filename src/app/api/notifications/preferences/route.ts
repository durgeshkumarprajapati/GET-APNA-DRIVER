import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreference,
  NOTIFICATION_CATEGORIES,
} from '@/modules/notification/application/notification-preference-service';

import { getUserNotificationIntelligenceConfig } from '@/modules/notification/application/notification-intelligence-service';
import { updateCustomerPreference } from '@/modules/customer/application/customer-preference-service';

const updatePreferenceSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES).optional(),
  push: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  frequencyCapEnabled: z.boolean().optional(),
  maxNonUrgentPerDay: z.number().min(1).max(20).optional(),
});

export const GET = withAuth(async (_req, { principal }) => {
  const [preferences, intelligenceConfig] = await Promise.all([
    getUserNotificationPreferences(principal.userId),
    getUserNotificationIntelligenceConfig(principal.userId),
  ]);
  return NextResponse.json({ preferences, intelligenceConfig }, { status: 200 });
});

export const PUT = withAuth(async (req, { principal }) => {
  const body = await req.json();
  const parsed = updatePreferenceSchema.parse(body);

  let updatedCategoryPref = null;
  if (parsed.category) {
    updatedCategoryPref = await updateUserNotificationPreference(principal.userId, {
      category: parsed.category,
      push: parsed.push,
      email: parsed.email,
      sms: parsed.sms,
    });
  }

  if (
    parsed.quietHoursEnabled !== undefined ||
    parsed.quietHoursStart !== undefined ||
    parsed.quietHoursEnd !== undefined ||
    parsed.frequencyCapEnabled !== undefined ||
    parsed.maxNonUrgentPerDay !== undefined
  ) {
    await updateCustomerPreference(principal.userId, {
      ...(parsed.quietHoursEnabled !== undefined && { quietHoursEnabled: parsed.quietHoursEnabled }),
      ...(parsed.quietHoursStart !== undefined && { quietHoursStart: parsed.quietHoursStart }),
      ...(parsed.quietHoursEnd !== undefined && { quietHoursEnd: parsed.quietHoursEnd }),
      ...(parsed.frequencyCapEnabled !== undefined && { frequencyCapEnabled: parsed.frequencyCapEnabled }),
      ...(parsed.maxNonUrgentPerDay !== undefined && { maxNonUrgentPerDay: parsed.maxNonUrgentPerDay }),
    });
  }

  const [preferences, intelligenceConfig] = await Promise.all([
    getUserNotificationPreferences(principal.userId),
    getUserNotificationIntelligenceConfig(principal.userId),
  ]);

  return NextResponse.json({ preferences, intelligenceConfig, updated: updatedCategoryPref }, { status: 200 });
});
