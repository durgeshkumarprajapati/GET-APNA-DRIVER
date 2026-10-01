import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { processAiConciergeMessage } from '@/modules/ai/application/ai-booking-concierge-service';

const conciergeInputSchema = z.object({
  message: z.string().min(1),
  locale: z.string().optional(),
  draftIdToConfirm: z.string().optional(),
});

export const POST = withPermission(
  PERMISSIONS.BOOKINGS_CREATE,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = conciergeInputSchema.parse(body);

    const result = await processAiConciergeMessage(principal.userId, parsed);
    return NextResponse.json(result, { status: 200 });
  },
);
