import 'server-only';
import {
  BookingStatus,
  BookingType,
  DriverApprovalStatus,
  DriverAvailabilityStatus,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { hireRateFieldFor } from '../domain/booking-policy';
import { SelectedDriverUnavailableError } from '../domain/errors';

const ACTIVE_HIRE_CONFLICT_STATUSES: BookingStatus[] = [
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.TRIP_IN_PROGRESS,
];

/**
 * Given candidate driver profile ids, returns the subset already committed
 * to another active hire whose window overlaps [hireStartAt, hireEndAt].
 * Shared by matching-service.ts (candidate pool narrowing), the
 * customer-facing browsable driver list, and required-driver validation at
 * booking creation, so the same conflict definition is used everywhere.
 */
export async function findConflictingDriverIds(
  driverProfileIds: string[],
  hireStartAt: Date,
  hireEndAt: Date,
  db: Db = prisma,
): Promise<Set<string>> {
  if (driverProfileIds.length === 0) return new Set();

  const conflicts = await db.booking.findMany({
    where: {
      driverProfileId: { in: driverProfileIds },
      status: { in: ACTIVE_HIRE_CONFLICT_STATUSES },
      hireStartAt: { lt: hireEndAt },
      hireEndAt: { gt: hireStartAt },
    },
    select: { driverProfileId: true },
  });

  return new Set(conflicts.map((c) => c.driverProfileId).filter((id): id is string => id !== null));
}

export interface DriverHireListing {
  driverProfileId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  ratingAverage: number;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  rate: string;
}

/**
 * Lists active, non-conflicting drivers who have opted into (set a rate
 * for) the given DAILY/WEEKLY/MONTHLY hire type — the browsable list shown
 * to a customer choosing a driver for that hire window.
 */
export async function listActiveDriversForHire(
  bookingType: BookingType,
  hireStartAt: Date,
  hireEndAt: Date,
  vehicleCategoryId?: string,
  db: Db = prisma,
): Promise<DriverHireListing[]> {
  const rateField = hireRateFieldFor(bookingType);
  if (!rateField) return [];

  const candidates = await db.driverProfile.findMany({
    where: {
      approvalStatus: DriverApprovalStatus.APPROVED,
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      [rateField]: { not: null },
      ...(vehicleCategoryId
        ? {
            vehicleCapabilities: {
              some: { vehicleCategoryId, vehicleCategory: { isActive: true } },
            },
          }
        : {}),
    },
    include: { ratingSummary: true },
  });
  if (candidates.length === 0) return [];

  const conflicting = await findConflictingDriverIds(
    candidates.map((c) => c.id),
    hireStartAt,
    hireEndAt,
    db,
  );

  return candidates
    .filter((c) => !conflicting.has(c.id))
    .map((c) => ({
      driverProfileId: c.id,
      displayName: c.displayName,
      firstName: c.firstName,
      lastName: c.lastName,
      profileImageUrl: c.profileImageUrl,
      ratingAverage: c.ratingSummary ? Number(c.ratingSummary.averageRating) : 0,
      drivingExperienceYears: c.drivingExperienceYears,
      primaryServiceArea: c.primaryServiceArea,
      rate: c[rateField] != null ? String(c[rateField]) : '0',
    }));
}

/**
 * Authoritatively validates a customer's required driver selection for a
 * DAILY/WEEKLY/MONTHLY booking — approved, available, has a rate set for
 * this hire type, and has no conflicting hire for the requested window.
 * Throws SelectedDriverUnavailableError rather than falling back to another
 * driver or a platform-default rate, matching this booking type's
 * no-fallback dispatch rule (see matching-service.ts).
 */
export async function validateSelectedHireDriver(
  driverProfileId: string,
  bookingType: BookingType,
  hireStartAt: Date,
  hireEndAt: Date,
  db: Db = prisma,
): Promise<{ rate: string }> {
  const rateField = hireRateFieldFor(bookingType);
  if (!rateField) {
    throw new SelectedDriverUnavailableError(
      driverProfileId,
      `${bookingType} does not support driver rate selection.`,
    );
  }

  const profile = await db.driverProfile.findUnique({ where: { id: driverProfileId } });
  const rate = profile?.[rateField] ?? null;

  if (
    !profile ||
    profile.approvalStatus !== DriverApprovalStatus.APPROVED ||
    profile.availabilityStatus !== DriverAvailabilityStatus.AVAILABLE ||
    !rate
  ) {
    throw new SelectedDriverUnavailableError(
      driverProfileId,
      'driver is not active or has not set a rate for this hire type.',
    );
  }

  const conflicting = await findConflictingDriverIds([driverProfileId], hireStartAt, hireEndAt, db);
  if (conflicting.has(driverProfileId)) {
    throw new SelectedDriverUnavailableError(
      driverProfileId,
      'driver already has a conflicting booking for this window.',
    );
  }

  return { rate: rate.toString() };
}

/**
 * Best-effort read of a driver's rate for a hire type, with no availability
 * or conflict validation — used only for the live fare-preview estimate,
 * never to commit a booking.
 */
export async function peekDriverHireRate(
  driverProfileId: string,
  bookingType: BookingType,
  db: Db = prisma,
): Promise<string | null> {
  const rateField = hireRateFieldFor(bookingType);
  if (!rateField) return null;

  const profile = await db.driverProfile.findUnique({
    where: { id: driverProfileId },
    select: { [rateField]: true },
  });
  const rate = profile?.[rateField as keyof typeof profile] as
    { toString(): string } | null | undefined;
  return rate ? rate.toString() : null;
}
