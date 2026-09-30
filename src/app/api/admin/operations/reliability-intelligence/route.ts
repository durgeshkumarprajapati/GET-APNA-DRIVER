import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getReliabilityIntelligence } from '@/modules/operations';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(PERMISSIONS.ADMIN_OPERATIONS_READ, async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const timeframeDays = Math.min(90, Math.max(1, Number(searchParams.get('days') || 7)));

    const intelligence = await getReliabilityIntelligence(timeframeDays);

    return NextResponse.json({
      success: true,
      data: intelligence,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});
