import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { evaluateCorporateBookingPolicy } from '@/modules/corporate/application/corporate-family-service';

const policyEvaluationSchema = z.object({
  organizationId: z.string().uuid(),
  employeeUserId: z.string().uuid(),
  estimatedFare: z.number().positive(),
  vehicleCategory: z.string().min(2),
  bookingTime: z.string().optional(),
});

export const POST = withPermission(
  PERMISSIONS.CORPORATE_POLICIES_READ,
  async (req) => {
    const body = await req.json();
    const parsed = policyEvaluationSchema.parse(body);

    const evaluation = await evaluateCorporateBookingPolicy(parsed);
    return NextResponse.json(evaluation, { status: 200 });
  },
);
