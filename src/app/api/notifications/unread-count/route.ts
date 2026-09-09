import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getUnreadNotificationCount } from '@/modules/notification/application/notification-service';

export const GET = withAuth(async (_req, { principal }) => {
  const count = await getUnreadNotificationCount(principal.userId);
  return NextResponse.json({ unreadCount: count }, { status: 200 });
});
