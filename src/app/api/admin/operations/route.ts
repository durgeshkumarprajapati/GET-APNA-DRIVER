import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOperationsCommandSummary } from '@/modules/operations';

export const GET = withPermission(PERMISSIONS.ADMIN_OPERATIONS_READ, async () => {
  try {
    const summary = await getOperationsCommandSummary();
    return NextResponse.json({ success: true, summary });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch operations command summary',
      },
      { status: 500 },
    );
  }
});
