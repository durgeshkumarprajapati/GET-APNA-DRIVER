import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { assignRole } from '@/modules/identity/application/services/role-assignment-service';

const assignRoleSchema = z.object({
  roleCode: z.string().min(1),
});

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.IDENTITY_USERS_ROLES_MANAGE,
  async (req, { principal }, routeContext) => {
    const { userId } = await routeContext!.params;
    const body = await req.json();
    const parsed = assignRoleSchema.parse(body);

    const assignment = await assignRole({
      userId,
      roleCode: parsed.roleCode,
      actor: principal,
    });

    return NextResponse.json({ assignment }, { status: 200 });
  },
);
