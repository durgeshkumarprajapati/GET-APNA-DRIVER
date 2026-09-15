import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { defaultForecastProvider, ForecastHorizon } from '@/modules/marketplace-intelligence/domain/forecast-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ,
  async (req) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const horizonParam = (searchParams.get('horizon') || '1h') as ForecastHorizon;
      const zoneId = searchParams.get('zoneId') || undefined;
      const vehicleCategory = searchParams.get('vehicleCategory') || undefined;

      const forecast = await defaultForecastProvider.generateForecast(horizonParam, zoneId, vehicleCategory);

      return NextResponse.json(forecast);
    } catch (error: unknown) {
      return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
    }
  },
);
