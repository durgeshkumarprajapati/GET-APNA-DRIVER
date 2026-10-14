import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { createWalletDebtTopupOrder } from '@/modules/finance/application/services/wallet-topup-service';

const createTopupSchema = z.object({
  amount: z.string().min(1).optional(),
});

export const POST = withPermission(
  PERMISSIONS.FINANCE_WALLET_DEBT_REPAY_CREATE,
  async (req, { principal }) => {
    const body = await req.json().catch(() => ({}));

    let parsed: z.infer<typeof createTopupSchema>;
    try {
      parsed = createTopupSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }
      throw error;
    }

    const topup = await createWalletDebtTopupOrder(principal.userId, { amount: parsed.amount });
    return NextResponse.json({ topup }, { status: 201 });
  },
);
