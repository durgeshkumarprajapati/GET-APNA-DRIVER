import 'server-only';
import {
  BookingStatus,
  BookingType,
  DriverApprovalStatus,
  DriverAvailabilityStatus,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { hireRateFieldFor, isDriverHireBooking } from '../domain/booking-policy';
import { SelectedDriverUnavailableError } from '../domain/errors';
import { findNearbyDrivers } from '@/modules/location/application/nearby-driver-service';
import {
  isDriverDispatchEligible,
  ensureDevDriverApproved,
} from '@/modules/driver/application/services/driver-eligibility-service';

const ACTIVE_HIRE_CONFLICT_STATUSES: BookingStatus[] = [
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.TRIP_IN_PROGRESS,
];

/**
 * Given candidate driver profile ids, returns the subset already committed
 * to another active booking whose interval overlaps [hireStartAt, hireEndAt].
 * Shared by matching-service.ts (candidate pool narrowing), the
 * customer-facing browsable driver list, and required-driver validation at
 * booking creation, so the same conflict definition is used everywhere.
 *
 * Computes each existing booking's own interval rather than filtering by its
 * raw hireStartAt/hireEndAt columns in the query — a plain POINT_TO_POINT/
 * ONE_WAY/ROUND_TRIP booking never sets those columns at all, so a driver
 * mid-trip on one of those would previously never show up as conflicting
 * for a new hire offer. Mirrors the single-driver interval logic in
 * driver-hire-conflict-service.ts's getDriverHireConflicts exactly, just
 * batched across many candidate driver ids in one query instead of one.
 */
export async function findConflictingDriverIds(
  driverProfileIds: string[],
  hireStartAt: Date,
  hireEndAt: Date,
  db: Db = prisma,
): Promise<Set<string>> {
  if (driverProfileIds.length === 0) return new Set();

  const candidateBookings = await db.booking.findMany({
    where: {
      driverProfileId: { in: driverProfileIds },
      status: { in: ACTIVE_HIRE_CONFLICT_STATUSES },
    },
    select: {
      driverProfileId: true,
      bookingType: true,
      requestedStartTime: true,
      requestedAt: true,
      hireStartAt: true,
      hireEndAt: true,
      estimatedDurationMinutes: true,
      hireDurationMinutes: true,
    },
  });

  const conflicting = new Set<string>();
  for (const b of candidateBookings) {
    if (!b.driverProfileId) continue;

    let existingStart: Date;
    let existingEnd: Date;
    if (isDriverHireBooking(b.bookingType)) {
      existingStart = b.hireStartAt ?? b.requestedStartTime ?? b.requestedAt;
      existingEnd = b.hireEndAt
        ? b.hireEndAt
        : new Date(existingStart.getTime() + (b.hireDurationMinutes ?? 60) * 60 * 1000);
    } else {
      // Point-to-point / one-way / round-trip — never sets hireStartAt/
      // hireEndAt, so its own trip window must be derived from the
      // estimated duration instead (+ a turnover buffer), matching
      // getDriverHireConflicts' identical fallback for the same case.
      existingStart = b.requestedStartTime ?? b.requestedAt;
      const tripMins = (b.estimatedDurationMinutes ?? 60) + 30;
      existingEnd = new Date(existingStart.getTime() + tripMins * 60 * 1000);
    }

    if (existingStart < hireEndAt && existingEnd > hireStartAt) {
      conflicting.add(b.driverProfileId);
    }
  }

  return conflicting;
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

  const nonConflicting = candidates.filter((c) => !conflicting.has(c.id));
  const verifiedEligible: typeof nonConflicting = [];

  for (const c of nonConflicting) {
    if (process.env.NODE_ENV !== 'production' && typeof ensureDevDriverApproved === 'function') {
      await ensureDevDriverApproved(c.id, db);
    }
    if (typeof isDriverDispatchEligible === 'function') {
      const dispatchEligibility = await isDriverDispatchEligible(c.id, hireStartAt, db);
      if (dispatchEligibility.isEligible) {
        verifiedEligible.push(c);
      }
    } else {
      verifiedEligible.push(c);
    }
  }

  return verifiedEligible.map((c) => ({
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

export interface AvailableDriverListing {
  driverProfileId: string;
  displayName: string;
  profileImageUrl: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  distanceMeters: number;
  distanceFormatted: string;
}

/**
 * Browsable list of currently available, non-conflicting nearby drivers for
 * a POINT_TO_POINT ride or an HOURLY hire — unlike listActiveDriversForHire
 * (DAILY/WEEKLY/MONTHLY), these two booking types are priced at the
 * platform-standard rate regardless of which driver is picked, so this
 * intentionally does NOT require a driver-set rate field, and it filters by
 * pickup-location proximity (via the same live geo index findNearbyDrivers
 * already uses for auto-dispatch) since physical distance is what actually
 * matters for an immediate ride or same-day hire — unlike a week/month-long
 * hire where it doesn't. Selecting a driver from this list is always
 * optional: it only sets a soft preferredDriverProfileId (same as the
 * existing favorite-driver picker), never a hard requirement — booking
 * without picking anyone still falls back to normal auto-dispatch matching.
 */
export async function listAvailableDriversForImmediateBooking(
  bookingType: BookingType,
  pickup?: { latitude: number; longitude: number; radiusMeters?: number } | null,
  vehicleCategoryId?: string,
  hireDurationMinutes?: number | null,
  db: Db = prisma,
): Promise<AvailableDriverListing[]> {
  if (bookingType !== BookingType.POINT_TO_POINT && bookingType !== BookingType.HOURLY) {
    return [];
  }

  let nearby: {
    driverId: string;
    displayName: string;
    profileImageUrl: string | null;
    drivingExperienceYears: number;
    primaryServiceArea: string | null;
    distanceMeters: number;
    distanceFormatted: string;
  }[] = [];

  if (pickup && pickup.latitude != null && pickup.longitude != null) {
    nearby = await findNearbyDrivers(
      {
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        radiusMeters: pickup.radiusMeters,
      },
      db,
    );
  }

  if (nearby.length === 0) {
    const activeProfiles = db?.driverProfile?.findMany
      ? await db.driverProfile.findMany({
          where: {
            approvalStatus: DriverApprovalStatus.APPROVED,
            availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
            user: { accountStatus: 'ACTIVE' },
            ...(vehicleCategoryId
              ? {
                  vehicleCapabilities: {
                    some: { vehicleCategoryId, vehicleCategory: { isActive: true } },
                  },
                }
              : {}),
          },
          include: {
            currentLocation: true,
          },
        })
      : [];

    nearby = activeProfiles.map((p) => {
      const displayName =
        p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Apna Driver';

      return {
        driverId: p.id,
        displayName,
        profileImageUrl: p.profileImageUrl,
        drivingExperienceYears: p.drivingExperienceYears,
        primaryServiceArea: p.primaryServiceArea,
        distanceMeters: 0,
        distanceFormatted: 'Available for hire',
      };
    });
  }

  if (nearby.length === 0) return [];

  let candidates = nearby;
  if (vehicleCategoryId && candidates.some((c) => c.driverId)) {
    const capable = await db.driverVehicleCapability.findMany({
      where: {
        driverProfileId: { in: candidates.map((c) => c.driverId) },
        vehicleCategoryId,
        vehicleCategory: { isActive: true },
      },
      select: { driverProfileId: true },
    });
    const capableSet = new Set(capable.map((c) => c.driverProfileId));
    candidates = candidates.filter((c) => capableSet.has(c.driverId));
  }
  if (candidates.length === 0) return [];

  const now = new Date();
  const windowEnd =
    bookingType === BookingType.HOURLY
      ? new Date(now.getTime() + Math.max(1, hireDurationMinutes ?? 60) * 60 * 1000)
      : now;

  const conflicting = await findConflictingDriverIds(
    candidates.map((c) => c.driverId),
    now,
    windowEnd,
    db,
  );

  const nonConflicting = candidates.filter((c) => !conflicting.has(c.driverId));
  const verifiedEligible: typeof nonConflicting = [];

  for (const c of nonConflicting) {
    if (process.env.NODE_ENV !== 'production' && typeof ensureDevDriverApproved === 'function') {
      await ensureDevDriverApproved(c.driverId, db);
    }
    if (typeof isDriverDispatchEligible === 'function') {
      const dispatchEligibility = await isDriverDispatchEligible(c.driverId, now, db);
      if (dispatchEligibility.isEligible) {
        verifiedEligible.push(c);
      }
    } else {
      verifiedEligible.push(c);
    }
  }

  return verifiedEligible.map((c) => ({
    driverProfileId: c.driverId,
    displayName: c.displayName,
    profileImageUrl: c.profileImageUrl,
    drivingExperienceYears: c.drivingExperienceYears,
    primaryServiceArea: c.primaryServiceArea,
    distanceMeters: c.distanceMeters,
    distanceFormatted: c.distanceFormatted,
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
