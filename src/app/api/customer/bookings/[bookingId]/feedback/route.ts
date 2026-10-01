import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { submitPostServiceFeedback } from '@/modules/customer/application/premium-journey-service';

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  tipAmount: z.number().min(0).optional(),
  feedbackTags: z.array(z.string()).optional(),
  issueCategory: z
    .enum(['OVERCHARGED', 'UNSAFE_DRIVING', 'DRIVER_NO_SHOW', 'CLEANLINESS_ISSUE', 'OTHER'])
    .optional(),
  issueDetails: z.string().optional(),
});

export const POST = withPermission(
  PERMISSIONS.BOOKINGS_READ,
  async (req, { principal }, routeContext) => {
    const params = await (routeContext as { params: Promise<{ bookingId: string }> }).params;
    const bookingId = params.bookingId;

    const body = await req.json();
    const parsed = feedbackSchema.parse(body);

    const result = await submitPostServiceFeedback(bookingId, principal.userId, parsed);
    return NextResponse.json(result, { status: 200 });
  },
);
