import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOperationsDecisionById } from '@/modules/operations';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(
  PERMISSIONS.ADMIN_OPERATIONS_READ,
  async (
    req: NextRequest,
    _context,
    routeContext?: { params: Promise<{ decisionId: string }> },
  ) => {
    try {
      if (!routeContext) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }
      const { decisionId } = await routeContext.params;
      const decision = await getOperationsDecisionById(decisionId);

      if (!decision) {
        return NextResponse.json(
          { success: false, error: 'Operational decision not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, decision });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
