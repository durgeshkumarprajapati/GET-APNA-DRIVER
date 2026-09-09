import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDisputeById } from '@/modules/dispute/application/dispute-service';

type RouteParams = { params: Promise<{ disputeId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.DISPUTE_READ,
  async (_req, { principal }, routeContext) => {
    const { disputeId } = await routeContext!.params;
    const dispute = await getDisputeById(disputeId);

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const isOwner = dispute.raisedByUserId === principal.userId;
    const isAdmin = principal.permissions.includes(PERMISSIONS.DISPUTE_MANAGE);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ dispute }, { status: 200 });
  },
);
