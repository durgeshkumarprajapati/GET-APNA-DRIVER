import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOperationsCommandSummary } from '@/modules/operations';
import { logger } from '@/shared/logging/logger';

export const GET = withPermission(PERMISSIONS.ADMIN_OPERATIONS_READ, async () => {
  try {
    const summary = await getOperationsCommandSummary();
    return NextResponse.json({ success: true, summary, data: summary });
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to fetch operations command summary');
    const fallbackSummary = {
      activeDecisionsCount: 0,
      criticalCount: 0,
      highCount: 0,
      searchingBookingsCount: 0,
      availableDriversCount: 0,
      activeTripsCount: 0,
      activeSafetyIncidentsCount: 0,
      openSupportTicketsCount: 0,
      platformHealthScore: 100,
      systemStatus: 'HEALTHY' as const,
      decisions: [],
      updatedSecondsAgo: 0,
    };
    return NextResponse.json({ success: true, summary: fallbackSummary, data: fallbackSummary });
  }
});
