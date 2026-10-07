import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { processNotificationDeliveryRetries } from '@/modules/notification/application/notification-delivery-retry-service';

// Admin/system-ops manual trigger only — this job now also runs
// automatically every worker iteration (see
// src/worker/jobs/notification-retry-sweep-job.ts). This endpoint is a
// fallback for manually kicking a retry sweep outside that cadence, not
// something any logged-in customer/driver should be able to invoke against
// every user's pending deliveries.
export const POST = withPermission(PERMISSIONS.SYSTEM_OUTBOX_MANAGE, async (_req) => {
  const result = await processNotificationDeliveryRetries();
  return NextResponse.json({ success: true, result }, { status: 200 });
});
