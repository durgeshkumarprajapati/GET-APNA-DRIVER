import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { generateBookingAndScheduleReminders } from '@/modules/notification/application/notification-reminder-service';

export const POST = withAuth(async (_req) => {
  // Can be called by customer, driver, or system background cron
  const result = await generateBookingAndScheduleReminders();
  return NextResponse.json({ success: true, result }, { status: 200 });
});
