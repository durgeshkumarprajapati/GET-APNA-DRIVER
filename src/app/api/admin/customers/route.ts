import 'server-only';
import { NextResponse } from 'next/server';
import { AccountStatus } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listCustomers } from '@/modules/customer/application/customer-admin-service';

export const GET = withPermission(PERMISSIONS.ADMIN_CUSTOMER_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const accountStatus = searchParams.get('accountStatus') as AccountStatus | null;
  const search = searchParams.get('search');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '25');

  const result = await listCustomers({
    ...(accountStatus ? { accountStatus } : {}),
    ...(search ? { search } : {}),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
  });

  return NextResponse.json(result, { status: 200 });
});
