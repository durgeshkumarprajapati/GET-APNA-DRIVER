import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { callingService } from '@/modules/calling/application/services/calling-service';
import { CallAuthorizationError } from '@/modules/calling/domain/errors';

const callSupportSchema = z.object({
  supportTicketId: z.string().uuid().optional().nullable(),
  reason: z.string().optional(),
});

export const POST = withPermission(
  PERMISSIONS.CALL_SUPPORT_INITIATE,
  async (req, { principal }) => {
    try {
      const body = await req.json().catch(() => ({}));
      const parsed = callSupportSchema.parse(body);

      const result = await callingService.initiateSupportCall(
        principal.userId,
        parsed.supportTicketId || undefined,
        parsed.reason,
      );

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'VALIDATION_ERROR', details: err.issues }, { status: 400 });
      }
      if (err instanceof CallAuthorizationError) {
        return NextResponse.json({ error: 'FORBIDDEN', message: err.message }, { status: 403 });
      }
      const message = err instanceof Error ? err.message : 'Failed to initiate support call.';
      return NextResponse.json({ error: 'CALL_INITIATION_FAILED', message }, { status: 500 });
    }
  },
);
