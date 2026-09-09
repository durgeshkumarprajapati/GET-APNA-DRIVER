import 'server-only';
import { NextResponse } from 'next/server';
import { DriverDocumentStatus } from '@prisma/client';
import { prisma } from '@/shared/database/prisma';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';

export const GET = withPermission(PERMISSIONS.ADMIN_DRIVER_DOCUMENT_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status') as DriverDocumentStatus | null;

  const documents = await prisma.driverDocument.findMany({
    where: {
      isCurrent: true,
      ...(statusParam ? { status: statusParam } : {}),
    },
    include: {
      driverProfile: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ documents }, { status: 200 });
});
