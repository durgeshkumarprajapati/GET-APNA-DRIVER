import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getProductionTrustMatrix } from '@/modules/trust/application/production-trust-matrix-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_METRICS_READ,
  async (_req) => {
    const report = await getProductionTrustMatrix();
    return NextResponse.json(report, { status: 200 });
  },
);
