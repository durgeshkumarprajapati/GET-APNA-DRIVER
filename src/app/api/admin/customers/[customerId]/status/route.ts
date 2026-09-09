import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AccountStatus } from '@prisma/client';
import { prisma } from '@/shared/database/prisma';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { transitionAccountStatus } from '@/modules/identity/application/services/account-status-service';
import { AppError } from '@/shared/errors/app-error';

const updateStatusSchema = z.object({
  targetStatus: z.nativeEnum(AccountStatus),
  reason: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ customerId: string }>;
}

class CustomerNotFoundError extends AppError {
  constructor(customerId: string) {
    super(`Customer profile '${customerId}' not found.`, 404, 'CUSTOMER_NOT_FOUND');
  }
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.IDENTITY_USERS_STATUS_MANAGE,
  async (req, { principal }, routeContext) => {
    const { customerId } = await routeContext!.params;
    const body = await req.json();
    const parsed = updateStatusSchema.parse(body);

    const profile = await prisma.customerProfile.findUnique({
      where: { id: customerId },
      select: { userId: true },
    });
    if (!profile) {
      throw new CustomerNotFoundError(customerId);
    }

    const user = await transitionAccountStatus({
      userId: profile.userId,
      targetStatus: parsed.targetStatus,
      actor: principal,
      reason: parsed.reason,
    });

    return NextResponse.json({ user }, { status: 200 });
  },
);
