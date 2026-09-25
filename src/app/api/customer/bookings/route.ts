import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { queryCustomerBookings } from '@/modules/booking/application/customer-booking-query-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req: NextRequest, { principal }) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '15', 10);
    const statusTab = (searchParams.get('statusTab') || 'ALL').toUpperCase() as
      'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;
    const paymentStatus = searchParams.get('paymentStatus') || undefined;

    const result = await queryCustomerBookings(principal.userId, {
      page,
      pageSize,
      statusTab,
      startDate,
      endDate,
      search,
      paymentStatus,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});
