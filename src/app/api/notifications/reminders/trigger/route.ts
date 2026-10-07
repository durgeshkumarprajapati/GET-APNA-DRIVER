import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { generateBookingAndScheduleReminders } from '@/modules/notification/application/notification-reminder-service';

// Admin/system-ops manual trigger only — this job now also runs
// automatically every worker iteration (see
// src/worker/jobs/booking-reminder-sweep-job.ts). This endpoint is a
// fallback for manually kicking a reminder sweep outside that cadence, not
// something any logged-in customer/driver should be able to invoke
// platform-wide.
export const POST = withPermission(PERMISSIONS.SYSTEM_OUTBOX_MANAGE, async (_req) => {
  const result = await generateBookingAndScheduleReminders();
  return NextResponse.json({ success: true, result }, { status: 200 });
});
