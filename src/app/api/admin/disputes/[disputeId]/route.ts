import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DisputeStatus } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getDisputeById,
  updateDisputeStatus,
  resolveDispute,
} from '@/modules/dispute/application/dispute-service';

type RouteParams = { params: Promise<{ disputeId: string }> };

const updateDisputeSchema = z.object({
  action: z.enum(['UPDATE_STATUS', 'RESOLVE', 'CANCEL']),
  toStatus: z.nativeEnum(DisputeStatus).optional(),
  resolutionSummary: z.string().optional(),
  refundAmountMinorUnits: z.number().int().nonnegative().optional(),
  financialAdjustmentSummary: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withPermission<RouteParams>(
  PERMISSIONS.DISPUTE_MANAGE,
  async (_req, _ctx, routeContext) => {
    const { disputeId } = await routeContext!.params;
    const dispute = await getDisputeById(disputeId);

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    return NextResponse.json({ dispute }, { status: 200 });
  },
);

export const PATCH = withPermission<RouteParams>(
  PERMISSIONS.DISPUTE_MANAGE,
  async (req, { principal }, routeContext) => {
    try {
      const { disputeId } = await routeContext!.params;
      const body = await req.json();
      const parsed = updateDisputeSchema.parse(body);

      if (parsed.action === 'RESOLVE') {
        if (!principal.permissions.includes(PERMISSIONS.DISPUTE_RESOLVE)) {
          return NextResponse.json(
            { error: 'Forbidden: missing dispute.resolve permission' },
            { status: 403 },
          );
        }

        if (!parsed.resolutionSummary) {
          return NextResponse.json(
            { error: 'resolutionSummary is required to resolve a dispute' },
            { status: 400 },
          );
        }

        const resolved = await resolveDispute({
          disputeId,
          actionUserId: principal.userId,
          resolutionSummary: parsed.resolutionSummary,
          refundAmountMinorUnits: parsed.refundAmountMinorUnits,
          financialAdjustmentSummary: parsed.financialAdjustmentSummary,
          notes: parsed.notes,
        });

        return NextResponse.json({ dispute: resolved }, { status: 200 });
      }

      const targetStatus =
        parsed.action === 'CANCEL'
          ? DisputeStatus.CANCELLED
          : (parsed.toStatus ?? DisputeStatus.UNDER_REVIEW);

      const updated = await updateDisputeStatus({
        disputeId,
        actionUserId: principal.userId,
        toStatus: targetStatus,
        assignedOperatorId: principal.userId,
        notes: parsed.notes,
      });

      return NextResponse.json({ dispute: updated }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update dispute';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
);
