import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { completeSettlement } from '@/modules/finance/application/services/settlement-service';

interface RouteParams {
  params: Promise<{ settlementId: string }>;
}

const completeSchema = z.object({
  payoutReference: z.string().min(1).optional(),
});

export const POST = withPermission<RouteParams>(
  PERMISSIONS.FINANCE_SETTLEMENT_MANAGE,
  async (req, { principal }, routeContext) => {
    const { settlementId } = await routeContext!.params;
    const body = await req.json().catch(() => ({}));

    let parsed: z.infer<typeof completeSchema>;
    try {
      parsed = completeSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }
      throw error;
    }

    const settlement = await completeSettlement(principal.userId, {
      settlementId,
      payoutReference: parsed.payoutReference,
    });
    return NextResponse.json({ settlement }, { status: 200 });
  },
);
