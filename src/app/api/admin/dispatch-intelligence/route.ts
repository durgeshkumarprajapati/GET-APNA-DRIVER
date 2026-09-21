import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { prisma } from '@/shared/database/prisma';
import { redis } from '@/shared/redis/client';
import {
  CANCELLATION_REASON_NO_DRIVER,
  SEARCH_DEADLINE_SECONDS,
} from '@/modules/dispatch/application/dispatch-search-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req) => {
  try {
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Active searches count
    const activeSearchesCount = await prisma.booking.count({
      where: { status: 'SEARCHING_DRIVER' },
    });

    // Active searches nearing deadline (> 90s search duration)
    const cutoff90s = new Date(now.getTime() - 90 * 1000);
    const searchesNearingDeadline = await prisma.booking.count({
      where: {
        status: 'SEARCHING_DRIVER',
        searchStartedAt: { lte: cutoff90s },
      },
    });

    // 24h No Driver Cancellations count
    const noDriverCancellations24h = await prisma.booking.count({
      where: {
        status: 'CANCELLED',
        cancellationReason: CANCELLATION_REASON_NO_DRIVER,
        cancelledAt: { gte: past24h },
      },
    });

    // Available Drivers in Redis GEO
    let availableDriversCount = 0;
    try {
      availableDriversCount = await redis.zcard('driver:geo:available');
    } catch {
      availableDriversCount = await prisma.driverProfile.count({
        where: { availabilityStatus: 'AVAILABLE' },
      });
    }

    // Active searches list with remaining seconds
    const activeSearches = await prisma.booking.findMany({
      where: { status: 'SEARCHING_DRIVER' },
      select: {
        id: true,
        pickupAddress: true,
        searchStartedAt: true,
        createdAt: true,
        expiresAt: true,
        _count: { select: { assignmentAttempts: true } },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const activeSearchesDetail = activeSearches.map((b) => {
      const started = b.searchStartedAt || b.createdAt;
      const deadline = b.expiresAt || new Date(started.getTime() + SEARCH_DEADLINE_SECONDS * 1000);
      const remainingSec = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 1000));
      return {
        bookingId: b.id,
        pickupAddress: b.pickupAddress,
        startedAt: started.toISOString(),
        deadlineAt: deadline.toISOString(),
        remainingSeconds: remainingSec,
        attemptsCount: b._count.assignmentAttempts,
      };
    });

    return NextResponse.json({
      summary: {
        activeSearchesCount,
        searchesNearingDeadline,
        noDriverCancellations24h,
        availableDriversCount,
        searchDeadlineSeconds: SEARCH_DEADLINE_SECONDS,
      },
      activeSearches: activeSearchesDetail,
    });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
