import 'server-only';
import { NextResponse } from 'next/server';
import { DriverDocumentStatus } from '@prisma/client';
import { prisma } from '@/shared/database/prisma';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export const GET = withPermission(PERMISSIONS.ADMIN_DRIVER_DOCUMENT_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status') as DriverDocumentStatus | null;
  const pageParam = Number(searchParams.get('page') ?? '1');
  const pageSizeParam = Number(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE));

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(pageSizeParam, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const where = {
    isCurrent: true,
    ...(statusParam ? { status: statusParam } : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.driverDocument.findMany({
      where,
      include: { driverProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.driverDocument.count({ where }),
  ]);

  const userIds = documents.map((doc) => doc.driverProfile.userId);
  const contactInfo = await getContactInfoForUsers(prisma, userIds);

  const enriched = documents.map((doc) => ({
    ...doc,
    driverProfile: {
      ...doc.driverProfile,
      user: {
        ...doc.driverProfile.user,
        ...(contactInfo.get(doc.driverProfile.userId) ?? { email: null, phoneNumber: null }),
      },
    },
  }));

  return NextResponse.json({ documents: enriched, total, page, pageSize }, { status: 200 });
});
