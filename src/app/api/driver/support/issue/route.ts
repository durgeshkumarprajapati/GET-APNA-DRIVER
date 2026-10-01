import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { reportDriverIssue } from '@/modules/driver/application/services/driver-issue-report-service';
import { toErrorResponse } from '@/shared/errors/app-error';

const reportIssueSchema = z.object({
  bookingId: z.string().optional(),
  issueCategory: z.enum([
    'FARE_DISPUTE',
    'CUSTOMER_NO_SHOW',
    'VEHICLE_TROUBLE',
    'APP_GLITCH',
    'ROUTE_PROBLEM',
    'OTHER',
  ]),
  description: z.string().min(10, 'Description must be at least 10 characters long.'),
});

export const POST = withPermission(
  PERMISSIONS.DRIVER_PROFILE_MANAGE,
  async (req, { principal }) => {
    try {
      const body = await req.json();
      const parsed = reportIssueSchema.parse(body);

      const profile = await getOrCreateDriverProfile(principal.userId);
      const result = await reportDriverIssue(profile.id, principal.userId, parsed);

      return NextResponse.json({ success: true, result }, { status: 201 });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
