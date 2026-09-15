import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(
  PERMISSIONS.ADMIN_CORPORATE_MANAGE,
  async (req) => {
    try {
      const organizations = await prisma.organization.findMany({
        include: {
          billingProfile: true,
          _count: { select: { members: true, bookings: true, travelPolicies: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ organizations }, { status: 200 });
    } catch (error: unknown) {
      return toErrorResponse(error, req.nextUrl.pathname);
    }
  }
);

export const PATCH = withPermission(
  PERMISSIONS.ADMIN_CORPORATE_MANAGE,
  async (req, { principal }) => {
    try {
      const body = await req.json();
      const { organizationId, status, creditLimit } = body;

      if (!organizationId) {
        return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
      }

      const updated = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          ...(status && { status }),
          ...(creditLimit !== undefined && { creditLimit: Number(creditLimit) }),
        },
      });

      await recordAuditLog(prisma, {
        actorUserId: principal.userId,
        action: 'ADMIN_CORPORATE_ORGANIZATION_UPDATE',
        entityType: 'ORGANIZATION',
        entityId: organizationId,
        afterState: { status, creditLimit },
      });

      return NextResponse.json({ organization: updated }, { status: 200 });
    } catch (error: unknown) {
      return toErrorResponse(error, req.nextUrl.pathname);
    }
  }
);
