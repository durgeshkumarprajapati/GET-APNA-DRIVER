import 'server-only';
import { NextResponse } from 'next/server';
import { listVehicleCategories } from '@/modules/driver/application/services/vehicle-category-service';

export async function GET() {
  try {
    const categories = await listVehicleCategories(true);
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch vehicle categories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
