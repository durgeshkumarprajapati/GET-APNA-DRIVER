import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { callingService } from '@/modules/calling/application/services/calling-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_CALLS_READ,
  async (req: NextRequest, { principal }) => {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const sessionId = searchParams.get('sessionId');

      if (sessionId) {
        const detail = await callingService.getCallSessionDetail(
          principal.userId,
          'ADMINISTRATOR',
          sessionId,
        );
        return NextResponse.json({ success: true, data: detail });
      }

      const result = await callingService.listUserCallHistory(
        principal.userId,
        'ADMINISTRATOR',
        { page, limit },
      );

      return NextResponse.json({ success: true, data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch admin call logs.';
      return NextResponse.json({ error: 'FETCH_ADMIN_CALLS_FAILED', message }, { status: 500 });
    }
  },
);
