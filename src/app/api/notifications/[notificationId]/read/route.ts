import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { markNotificationAsRead } from '@/modules/notification/application/notification-service';

export const POST = withAuth(
  async (_req, { principal }, routeContext?: { params: Promise<{ notificationId: string }> }) => {
    const params = await routeContext?.params;
    const notificationId = params?.notificationId;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const updated = await markNotificationAsRead(principal.userId, notificationId);

    if (!updated) {
      return NextResponse.json(
        { error: 'Notification not found or unauthorized' },
        { status: 444 },
      );
    }

    return NextResponse.json({ notification: updated }, { status: 200 });
  },
);
