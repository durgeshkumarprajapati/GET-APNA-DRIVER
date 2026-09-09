import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { listUserPushSubscriptions } from '@/modules/notification/application/push-notification-service';

export const GET = withAuth(async (_req, { principal }) => {
  const subscriptions = await listUserPushSubscriptions(principal.userId);
  return NextResponse.json({ subscriptions }, { status: 200 });
});
