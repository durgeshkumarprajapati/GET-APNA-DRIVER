import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';

type RouteParams = { params: Promise<{ incidentId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_INCIDENT_READ,
  async (_req, _ctx, routeContext) => {
    try {
      const { incidentId } = await routeContext!.params;

      const incident = await prisma.tripReliabilityIncident.findUnique({
        where: { id: incidentId },
        include: {
          booking: {
            select: {
              id: true,
              status: true,
              pickupAddress: true,
              pickupLatitude: true,
              pickupLongitude: true,
              dropoffAddress: true,
              dropoffLatitude: true,
              dropoffLongitude: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          customer: {
            select: { id: true },
          },
          driverProfile: {
            select: { id: true, userId: true },
          },
          timelineEntries: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!incident) {
        return NextResponse.json({ error: 'INCIDENT_NOT_FOUND' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: incident });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch incident details.';
      return NextResponse.json({ error: 'FETCH_FAILED', message }, { status: 500 });
    }
  },
);
