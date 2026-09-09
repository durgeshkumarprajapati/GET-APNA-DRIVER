import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  createSettlement,
  listAllSettlements,
} from '@/modules/finance/application/services/settlement-service';

const createSettlementSchema = z.object({
  driverProfileId: z.string().min(1),
  amount: z.string().min(1).optional(),
});

export const GET = withPermission(PERMISSIONS.FINANCE_SETTLEMENT_MANAGE, async () => {
  const settlements = await listAllSettlements();
  return NextResponse.json({ settlements }, { status: 200 });
});

export const POST = withPermission(
  PERMISSIONS.FINANCE_SETTLEMENT_MANAGE,
  async (req, { principal }) => {
    const body = await req.json();

    let parsed: z.infer<typeof createSettlementSchema>;
    try {
      parsed = createSettlementSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }
      throw error;
    }

    const settlement = await createSettlement(principal.userId, parsed);
    return NextResponse.json({ settlement }, { status: 201 });
  },
);
