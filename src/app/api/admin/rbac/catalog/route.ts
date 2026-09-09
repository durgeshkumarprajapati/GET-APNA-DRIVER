import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getRbacCatalog } from '@/modules/identity/application/services/rbac-admin-service';

export const GET = withPermission(PERMISSIONS.IDENTITY_ROLES_READ, async () => {
  const catalog = await getRbacCatalog();
  return NextResponse.json(catalog, { status: 200 });
});
