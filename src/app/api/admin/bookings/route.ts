import 'server-only';
import { NextResponse } from 'next/server';
import { BookingStatus } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listDispatchBookings } from '@/modules/booking/application/dispatch-service';

export const GET = withPermission(PERMISSIONS.DISPATCH_BOOKING_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as BookingStatus | null;
  const search = searchParams.get('search');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '25');

  const result = await listDispatchBookings({
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
  });

  return NextResponse.json(result, { status: 200 });
});
