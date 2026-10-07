import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { parseAndValidateAiConcierge2 } from '@/modules/ai/application/services/ai-concierge2-service';

const parseSchema = z.object({
  prompt: z.string().min(3),
});

export const POST = withPermission(
  PERMISSIONS.BOOKINGS_CREATE,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = parseSchema.parse(body);

    const result = await parseAndValidateAiConcierge2(principal.userId, parsed.prompt);
    return NextResponse.json(result, { status: 200 });
  },
);
