import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { markAllNotificationsAsRead } from '@/modules/notification/application/notification-service';

export const POST = withAuth(async (_req, { principal }) => {
  const updatedCount = await markAllNotificationsAsRead(principal.userId);
  return NextResponse.json({ updatedCount }, { status: 200 });
});
