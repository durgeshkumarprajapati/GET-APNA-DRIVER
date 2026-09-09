import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listAuditLogs } from '@/shared/audit/audit-service';

export const GET = withPermission(PERMISSIONS.AUDIT_LOG_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const actorUserId = searchParams.get('actorUserId') ?? undefined;
  const entityType = searchParams.get('entityType') ?? undefined;
  const entityId = searchParams.get('entityId') ?? undefined;
  const action = searchParams.get('action') ?? undefined;
  const fromDateParam = searchParams.get('fromDate');
  const toDateParam = searchParams.get('toDate');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '25');

  const result = await listAuditLogs({
    actorUserId,
    entityType,
    entityId,
    action,
    ...(fromDateParam ? { fromDate: new Date(fromDateParam) } : {}),
    ...(toDateParam ? { toDate: new Date(toDateParam) } : {}),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
  });

  return NextResponse.json(result, { status: 200 });
});
