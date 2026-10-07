import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { processQuickBookUX3 } from '@/modules/booking/application/services/customer-booking-ux3-service';

const quickBookSchema = z.object({
  serviceType: z.enum(['ONE_WAY', 'ROUND_TRIP', 'HOURLY', 'FULL_DAY']),
  pickupAddress: z.string().min(3),
  pickupLat: z.number(),
  pickupLng: z.number(),
  dropoffAddress: z.string().optional(),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  vehicleCategory: z.enum(['HATCHBACK', 'SEDAN', 'SUV', 'LUXURY']),
  recipientId: z.string().optional(),
  scheduledTime: z.string().optional(),
  couponCode: z.string().optional(),
});

export const POST = withPermission(
  PERMISSIONS.BOOKINGS_CREATE,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = quickBookSchema.parse(body);

    const result = await processQuickBookUX3(principal.userId, parsed);
    return NextResponse.json(result, { status: 200 });
  },
);
