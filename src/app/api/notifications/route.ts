import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { listUserNotifications } from '@/modules/notification/application/notification-service';

import { NotificationType, NotificationStatus } from '@prisma/client';

export const GET = withAuth(async (req, { principal }) => {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') as NotificationType | null) ?? undefined;
  const status = (searchParams.get('status') as NotificationStatus | null) ?? undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

  const result = await listUserNotifications({
    userId: principal.userId,
    type,
    status,
    limit,
    offset,
  });

  return NextResponse.json(result, { status: 200 });
});
