import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listUsersWithRoles } from '@/modules/identity/application/services/rbac-admin-service';

export const GET = withPermission(PERMISSIONS.IDENTITY_ROLES_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? undefined;
  const roleCode = searchParams.get('roleCode') ?? undefined;
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '25');

  const result = await listUsersWithRoles({
    search,
    roleCode,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
  });

  return NextResponse.json(result, { status: 200 });
});
