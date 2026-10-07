import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getUserActiveOrganization } from '@/modules/corporate/domain/organization-service';
import { evaluateCorporateBookingPolicy } from '@/modules/corporate/application/corporate-family-service';
import { toErrorResponse } from '@/shared/errors/app-error';

const policyEvaluationSchema = z.object({
  employeeUserId: z.string().uuid(),
  estimatedFare: z.number().positive(),
  estimatedDistanceKm: z.number().nonnegative().optional(),
  vehicleCategory: z.string().min(2),
  bookingTime: z.string().optional(),
  monthlySpentSoFar: z.number().nonnegative().optional(),
});

export const POST = withPermission(
  PERMISSIONS.CORPORATE_POLICIES_READ,
  async (req, { principal }) => {
    try {
      // The organization is derived from the caller's own membership, never
      // from a client-supplied organizationId — otherwise any member of any
      // organization could preview another organization's travel policy.
      const membership = await getUserActiveOrganization(principal.userId);
      if (!membership) {
        return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
      }

      const body = await req.json();
      const parsed = policyEvaluationSchema.parse(body);

      const evaluation = await evaluateCorporateBookingPolicy({
        ...parsed,
        organizationId: membership.organizationId,
      });
      return NextResponse.json(evaluation, { status: 200 });
    } catch (error: unknown) {
      return toErrorResponse(error, req.nextUrl.pathname);
    }
  },
);
