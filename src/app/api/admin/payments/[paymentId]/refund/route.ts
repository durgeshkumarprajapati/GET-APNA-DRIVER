import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { initiateRefund } from '@/modules/finance/application/services/refund-service';

interface RouteParams {
  params: Promise<{ paymentId: string }>;
}

const refundSchema = z.object({
  amount: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
});

export const POST = withPermission<RouteParams>(
  PERMISSIONS.PAYMENTS_REFUND,
  async (req, { principal }, routeContext) => {
    const { paymentId } = await routeContext!.params;
    const body = await req.json().catch(() => ({}));

    let parsed: z.infer<typeof refundSchema>;
    try {
      parsed = refundSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }
      throw error;
    }

    const idempotencyKey = req.headers.get('x-idempotency-key');

    const refund = await initiateRefund(principal.userId, {
      paymentId,
      amount: parsed.amount,
      reason: parsed.reason,
      idempotencyKey,
    });

    return NextResponse.json({ refund }, { status: 201 });
  },
);
