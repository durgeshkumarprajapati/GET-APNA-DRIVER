import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ incidentId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_INCIDENT_READ,
  async (req, _ctx, routeContext) => {
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
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
