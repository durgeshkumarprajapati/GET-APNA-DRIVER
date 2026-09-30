import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getCapacityForecastSummary } from '@/modules/operations';
import type { ForecastHorizon } from '@/modules/marketplace-intelligence/domain/forecast-service';
import { toErrorResponse } from '@/shared/errors/app-error';

const VALID_HORIZONS: ForecastHorizon[] = ['30m', '1h', '2h', '4h'];

export const GET = withPermission(PERMISSIONS.ADMIN_OPERATIONS_READ, async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const requestedHorizon = searchParams.get('horizon');
    const horizon: ForecastHorizon = VALID_HORIZONS.includes(requestedHorizon as ForecastHorizon)
      ? (requestedHorizon as ForecastHorizon)
      : '1h';

    const data = await getCapacityForecastSummary(horizon);

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});
