import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { failOrCancelSettlement } from '@/modules/finance/application/services/settlement-service';

interface RouteParams {
  params: Promise<{ settlementId: string }>;
}

const failSchema = z.object({
  reason: z.string().min(1),
});

export const POST = withPermission<RouteParams>(
  PERMISSIONS.FINANCE_SETTLEMENT_MANAGE,
  async (req, { principal }, routeContext) => {
    const { settlementId } = await routeContext!.params;
    const body = await req.json();

    let parsed: z.infer<typeof failSchema>;
    try {
      parsed = failSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }
      throw error;
    }

    const settlement = await failOrCancelSettlement(
      principal.userId,
      settlementId,
      'FAILED',
      parsed.reason,
    );
    return NextResponse.json({ settlement }, { status: 200 });
  },
);
