import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { processNotificationDeliveryRetries } from '@/modules/notification/application/notification-delivery-retry-service';

export const POST = withAuth(async (_req) => {
  const result = await processNotificationDeliveryRetries();
  return NextResponse.json({ success: true, result }, { status: 200 });
});
