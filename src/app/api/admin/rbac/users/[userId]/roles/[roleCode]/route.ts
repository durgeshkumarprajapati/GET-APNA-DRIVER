import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { revokeRole } from '@/modules/identity/application/services/role-assignment-service';

interface RouteParams {
  params: Promise<{ userId: string; roleCode: string }>;
}

export const DELETE = withPermission<RouteParams>(
  PERMISSIONS.IDENTITY_USERS_ROLES_MANAGE,
  async (_req, { principal }, routeContext) => {
    const { userId, roleCode } = await routeContext!.params;

    const revoked = await revokeRole({
      userId,
      roleCode,
      actor: principal,
    });

    return NextResponse.json({ revoked }, { status: 200 });
  },
);
