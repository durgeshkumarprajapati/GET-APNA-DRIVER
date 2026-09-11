import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { callingService } from '@/modules/calling/application/services/calling-service';

export const GET = withPermission(
  PERMISSIONS.CALL_SUPPORT_INITIATE,
  async (req: NextRequest, { principal }) => {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const sessionId = searchParams.get('sessionId');

      const userRole = principal.roles?.[0] || 'CUSTOMER';

      if (sessionId) {
        const detail = await callingService.getCallSessionDetail(
          principal.userId,
          userRole,
          sessionId,
        );
        return NextResponse.json({ success: true, data: detail });
      }

      const result = await callingService.listUserCallHistory(
        principal.userId,
        userRole,
        { page, limit },
      );

      return NextResponse.json({ success: true, data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch call history.';
      return NextResponse.json({ error: 'FETCH_CALLS_FAILED', message }, { status: 500 });
    }
  },
);
