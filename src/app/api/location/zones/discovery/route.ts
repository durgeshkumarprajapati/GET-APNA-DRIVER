import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getMarketplaceZoneCoverage } from '@/modules/location/application/marketplace-zone-service';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const latStr = searchParams.get('lat') ?? '28.6139'; // Default Delhi center
  const lngStr = searchParams.get('lng') ?? '77.2090';

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  const coverage = await getMarketplaceZoneCoverage(lat, lng);
  return NextResponse.json({ coverage }, { status: 200 });
}
