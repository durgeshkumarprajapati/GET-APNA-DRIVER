import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOutboxStats, listDeadLetterEvents } from '@/shared/outbox/outbox-admin-service';

export const GET = withPermission(PERMISSIONS.SYSTEM_OUTBOX_MANAGE, async (req) => {
  const searchParams = req.nextUrl.searchParams;

  const [stats, deadLetter] = await Promise.all([
    getOutboxStats(),
    listDeadLetterEvents({
      page: Number(searchParams.get('page')) || undefined,
      pageSize: Number(searchParams.get('pageSize')) || undefined,
    }),
  ]);

  return NextResponse.json({ stats, deadLetter }, { status: 200 });
});
