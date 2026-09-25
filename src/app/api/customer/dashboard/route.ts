import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getCustomerDashboardData } from '@/modules/customer/application/customer-dashboard-service';

export const GET = withAuth(async (_req, { principal }) => {
  const dashboardData = await getCustomerDashboardData(principal.userId);
  return NextResponse.json({ success: true, dashboard: dashboardData }, { status: 200 });
});
