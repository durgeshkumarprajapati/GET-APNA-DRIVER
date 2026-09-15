import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';

import type { Prisma } from '@prisma/client';

export const GET = withPermission(
  PERMISSIONS.ADMIN_INCIDENT_READ,
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const severity = searchParams.get('severity');
      const type = searchParams.get('type');
      const page = Math.max(1, Number(searchParams.get('page') || 1));
      const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)));
      const skip = (page - 1) * limit;

      const where: Prisma.TripReliabilityIncidentWhereInput = {};
      if (status) where.status = status as Prisma.EnumIncidentStatusFilter;
      if (severity) where.severity = severity as Prisma.EnumIncidentSeverityFilter;
      if (type) where.type = type as Prisma.EnumIncidentTypeFilter;

      const [total, incidents] = await Promise.all([
        prisma.tripReliabilityIncident.count({ where }),
        prisma.tripReliabilityIncident.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            booking: {
              select: {
                id: true,
                status: true,
                pickupAddress: true,
                dropoffAddress: true,
              },
            },
            customer: {
              select: { id: true },
            },
            driverProfile: {
              select: { id: true, userId: true },
            },
          },
        }),
      ]);

      const [totalActive, totalCritical, totalRecovering, totalEscalated, totalResolvedToday] = await Promise.all([
        prisma.tripReliabilityIncident.count({
          where: { status: { in: ['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'RECOVERY_PENDING', 'RECOVERING', 'ESCALATED'] } },
        }),
        prisma.tripReliabilityIncident.count({
          where: { severity: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED', 'DISMISSED'] } },
        }),
        prisma.tripReliabilityIncident.count({
          where: { status: 'RECOVERING' },
        }),
        prisma.tripReliabilityIncident.count({
          where: { status: 'ESCALATED' },
        }),
        prisma.tripReliabilityIncident.count({
          where: {
            status: 'RESOLVED',
            resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
      ]);

      return NextResponse.json({
        incidents,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        metrics: {
          totalActive,
          totalCritical,
          totalRecovering,
          totalEscalated,
          totalResolvedToday,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list incidents.';
      return NextResponse.json({ error: 'FETCH_FAILED', message }, { status: 500 });
    }
  }
);
