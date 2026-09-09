import 'server-only';
import { DriverAvailabilityStatus, type DriverProfile } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { evaluateDriverEligibility } from './driver-eligibility-service';
import { getOrCreateDriverProfile } from './driver-profile-service';
import { DriverNotEligibleError } from '../../domain/errors';
import {
  addDriverToLiveIndex,
  removeDriverFromLiveIndex,
} from '@/modules/location/application/driver-location-service';

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
  return await dbClient.$transaction(async (tx) => {
    const profile = await getOrCreateDriverProfile(userId, tx);

    if (targetStatus === DriverAvailabilityStatus.AVAILABLE) {
      const evaluation = await evaluateDriverEligibility(profile.id, tx);
      if (!evaluation.isEligible) {
        throw new DriverNotEligibleError(evaluation.reasons);
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
      eventType: 'driver.availability.changed',
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
    } else {
      await removeDriverFromLiveIndex(profile.id, tx);
    }

    return updated;
  });
}
