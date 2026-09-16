import { prisma, type Db } from '@/shared/database/prisma';
import type { PlatformHealthSnapshot, PlatformHealthStatus, Prisma } from '@prisma/client';

export interface CreateSnapshotInput {
  overallScore: number;
  overallStatus: PlatformHealthStatus;
  applicationStatus: PlatformHealthStatus;
  databaseStatus: PlatformHealthStatus;
  redisStatus: PlatformHealthStatus;
  workerStatus: PlatformHealthStatus;
  bookingStatus: PlatformHealthStatus;
  dispatchStatus: PlatformHealthStatus;
  paymentStatus: PlatformHealthStatus;
  notificationStatus: PlatformHealthStatus;
  locationStatus: PlatformHealthStatus;
  scheduledRideStatus: PlatformHealthStatus;
  reliabilityStatus: PlatformHealthStatus;
  dependencyStatus: PlatformHealthStatus;
  evidence: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class HealthSnapshotRepository {
  static async create(input: CreateSnapshotInput, db: Db = prisma): Promise<PlatformHealthSnapshot> {
    return db.platformHealthSnapshot.create({
      data: {
        overallScore: input.overallScore,
        overallStatus: input.overallStatus,
        applicationStatus: input.applicationStatus,
        databaseStatus: input.databaseStatus,
        redisStatus: input.redisStatus,
        workerStatus: input.workerStatus,
        bookingStatus: input.bookingStatus,
        dispatchStatus: input.dispatchStatus,
        paymentStatus: input.paymentStatus,
        notificationStatus: input.notificationStatus,
        locationStatus: input.locationStatus,
        scheduledRideStatus: input.scheduledRideStatus,
        reliabilityStatus: input.reliabilityStatus,
        dependencyStatus: input.dependencyStatus,
        evidence: input.evidence as Prisma.InputJsonValue,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  static async findLatest(db: Db = prisma): Promise<PlatformHealthSnapshot | null> {
    return db.platformHealthSnapshot.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findHistory(limit: number = 60, db: Db = prisma): Promise<PlatformHealthSnapshot[]> {
    return db.platformHealthSnapshot.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  static async pruneOlderThan(cutoff: Date, db: Db = prisma): Promise<number> {
    const result = await db.platformHealthSnapshot.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },
      },
    });
    return result.count;
  }
}
