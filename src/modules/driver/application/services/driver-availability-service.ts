import 'server-only';
import { DriverApprovalStatus, DriverAvailabilityStatus, type DriverProfile } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { evaluateDriverEligibility, ensureDevDriverApproved } from './driver-eligibility-service';
import { getOrCreateDriverProfile } from './driver-profile-service';
import { DriverNotEligibleError } from '../../domain/errors';
import {
  addDriverToLiveIndex,
  removeDriverFromLiveIndex,
  updateDriverLocation,
} from '@/modules/location/application/driver-location-service';
import { handleDriverOnlinePresence } from '@/modules/dispatch/application/dispatch-search-service';

/**
 * Retrieves driver availability status alongside current eligibility status.
 */
export async function getDriverAvailability(
  userId: string,
  db: Db = prisma,
): Promise<{
  availabilityStatus: DriverAvailabilityStatus;
  isEligible: boolean;
  reasons: string[];
}> {
  const profile = await getOrCreateDriverProfile(userId, db);
  if (
    process.env.NODE_ENV !== 'production' &&
    profile.approvalStatus !== DriverApprovalStatus.APPROVED
  ) {
    await ensureDevDriverApproved(profile.id, db);
  }
  const evaluation = await evaluateDriverEligibility(profile.id, db);

  return {
    availabilityStatus: profile.availabilityStatus,
    isEligible: evaluation.isEligible,
    reasons: evaluation.reasons,
  };
}

/**
 * Sets driver availability status authoritatively after enforcing server eligibility rules.
 */
export async function setDriverAvailability(
  userId: string,
  targetStatus: DriverAvailabilityStatus,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverProfile> {
  // If location coordinates were passed in requestMetadata, update driver location first
  if (
    targetStatus === DriverAvailabilityStatus.AVAILABLE &&
    requestMetadata &&
    typeof requestMetadata.latitude === 'number' &&
    typeof requestMetadata.longitude === 'number'
  ) {
    try {
      await updateDriverLocation(
        userId,
        {
          latitude: requestMetadata.latitude,
          longitude: requestMetadata.longitude,
          accuracy: typeof requestMetadata.accuracy === 'number' ? requestMetadata.accuracy : null,
          capturedAt: new Date(),
        },
        requestMetadata,
        dbClient,
      );
    } catch {
      // Fail-safe; location check below will validate
    }
  }

  const updatedProfile = await dbClient.$transaction(async (tx) => {
    const profile = await getOrCreateDriverProfile(userId, tx);

    if (targetStatus === DriverAvailabilityStatus.AVAILABLE) {
      if (
        process.env.NODE_ENV !== 'production' &&
        profile.approvalStatus !== DriverApprovalStatus.APPROVED
      ) {
        await ensureDevDriverApproved(profile.id, tx);
      }
      const evaluation = await evaluateDriverEligibility(profile.id, tx);
      if (!evaluation.isEligible) {
        throw new DriverNotEligibleError(evaluation.reasons);
      }

      // Operational Driver Presence: Verify valid recent current location
      const currentLocation = await tx.driverCurrentLocation.findUnique({
        where: { driverProfileId: profile.id },
      });

      const now = new Date();
      const isFresh =
        currentLocation &&
        now.getTime() - currentLocation.capturedAt.getTime() <= 120 * 1000;

      if (!currentLocation || !isFresh) {
        // If developer testing or fallback location, create default active location if missing
        if (process.env.NODE_ENV !== 'production' && !currentLocation) {
          await tx.driverCurrentLocation.upsert({
            where: { driverProfileId: profile.id },
            create: {
              driverProfileId: profile.id,
              latitude: 19.076,
              longitude: 72.8777,
              accuracy: 10,
              capturedAt: now,
            },
            update: {
              latitude: 19.076,
              longitude: 72.8777,
              accuracy: 10,
              capturedAt: now,
            },
          });
        } else if (!currentLocation || !isFresh) {
          throw new DriverNotEligibleError([
            'Location required to go online. Current device location is missing or stale.',
          ]);
        }
      }
    }

    const updated = await tx.driverProfile.update({
      where: { id: profile.id },
      data: {
        availabilityStatus: targetStatus,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'driver.availability.changed',
      entityType: 'DriverProfile',
      entityId: profile.id,
      beforeState: { availabilityStatus: profile.availabilityStatus },
      afterState: { availabilityStatus: updated.availabilityStatus },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: targetStatus === DriverAvailabilityStatus.AVAILABLE ? 'driver.presence.available' : 'driver.availability.changed',
      aggregateType: 'DriverProfile',
      aggregateId: profile.id,
      payload: {
        userId,
        driverProfileId: profile.id,
        availabilityStatus: updated.availabilityStatus,
      },
    });

    if (updated.availabilityStatus === DriverAvailabilityStatus.AVAILABLE) {
      await addDriverToLiveIndex(profile.id, tx);
      await handleDriverOnlinePresence(profile.id, tx);
    } else {
      await removeDriverFromLiveIndex(profile.id, tx);
    }

    return updated;
  });

  return updatedProfile;
}
