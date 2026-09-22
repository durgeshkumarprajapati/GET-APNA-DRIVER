import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { listVehicleCategories } from '@/modules/driver/application/services/vehicle-category-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export async function GET(request: NextRequest) {
  try {
    const categories = await listVehicleCategories(true);
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, request.nextUrl.pathname);
  }
}
