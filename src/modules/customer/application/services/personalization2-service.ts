import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { CustomerPersonalizationSettingsDTO } from '../../domain/personalization2-types';
import {
  getOrCreateCustomerPreference,
  updateCustomerPreference,
} from '../customer-preference-service';
import { ExperienceOrchestrationService } from '@/modules/experience/application/experience-orchestration-service';

/**
 * Phase 109 — Personalization 2.0 Service
 * Provides personalized shortcuts with explicit "Why am I seeing this?" explanations
 * and an opt-out "Personalization OFF" toggle.
 *
 * Reuses ExperienceOrchestrationService (the real, already-hardened Phase
 * 89 recommendation engine) for shortcuts, and CustomerPreference for the
 * enabled flag — a prior version hardcoded two fake shortcuts with
 * fabricated behavioral claims ("3 previous airport trips") and a fake
 * preferred driver name ('Rajesh Kumar'), and its toggle never persisted
 * anything (claimed success without writing to the database).
 */
export async function getPersonalization2Settings(
  customerId: string,
  db: Db = prisma,
): Promise<CustomerPersonalizationSettingsDTO> {
  const [preference, recommendations, recentBookings, favoriteDriver] = await Promise.all([
    getOrCreateCustomerPreference(customerId, db),
    ExperienceOrchestrationService.generateCustomerExperiences(customerId),
    db.booking.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.customerFavoriteDriver.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        driverProfile: { select: { displayName: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  // generateCustomerExperiences already returns recommendations ranked by
  // real priority — there's no separate "shortcut" recommendation type to
  // filter by, so the top few of whatever's actually relevant right now
  // serve as the personalized shortcuts.
  const shortcuts = recommendations.slice(0, 3).map((r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.description,
    actionUrl: r.action.targetUrl ?? '/bookings/new',
    whyAmISeeingThisReason: r.reason,
  }));

  // Most frequent booking type among recent bookings — real signal, not a
  // fixed 'ONE_WAY' regardless of history.
  const serviceTypeFrequency = new Map<string, number>();
  for (const b of recentBookings) {
    serviceTypeFrequency.set(b.bookingType, (serviceTypeFrequency.get(b.bookingType) ?? 0) + 1);
  }
  let preferredService = 'No booking history yet';
  let topServiceCount = 0;
  for (const [type, count] of serviceTypeFrequency) {
    if (count > topServiceCount) {
      preferredService = type;
      topServiceCount = count;
    }
  }

  // Most common hour-of-day among recent bookings' requested start times.
  const hourFrequency = new Map<number, number>();
  for (const b of recentBookings) {
    const ref = b.requestedStartTime ?? b.createdAt;
    const hour = new Date(ref).getHours();
    hourFrequency.set(hour, (hourFrequency.get(hour) ?? 0) + 1);
  }
  let preferredBookingTimeOfDay = 'Not enough data yet';
  let topHourCount = 0;
  for (const [hour, count] of hourFrequency) {
    if (count > topHourCount) {
      const next = (hour + 1) % 24;
      preferredBookingTimeOfDay = `${hour.toString().padStart(2, '0')}:00 - ${next.toString().padStart(2, '0')}:00`;
      topHourCount = count;
    }
  }

  const preferredPickupLocation = recentBookings[0]?.pickupAddress ?? 'No booking history yet';

  const driverProfile = favoriteDriver?.driverProfile;
  const preferredDriverName =
    driverProfile &&
    (driverProfile.displayName ||
      [driverProfile.firstName, driverProfile.lastName].filter(Boolean).join(' '));

  return {
    customerId,
    isPersonalizationEnabled: preference.personalizationEnabled,
    preferredService,
    preferredBookingTimeOfDay,
    preferredPickupLocation,
    preferredDriverName: preferredDriverName || undefined,
    shortcuts,
  };
}

export async function togglePersonalization2State(
  customerId: string,
  isEnabled: boolean,
  db: Db = prisma,
): Promise<{ success: boolean; isPersonalizationEnabled: boolean; message: string }> {
  const updated = await updateCustomerPreference(
    customerId,
    { personalizationEnabled: isEnabled },
    null,
    db,
  );

  return {
    success: true,
    isPersonalizationEnabled: updated.personalizationEnabled,
    message: updated.personalizationEnabled
      ? 'Personalization enabled. Your shortcuts will reflect your frequent routes.'
      : 'Personalization turned OFF. Dashboard will now display standard default view.',
  };
}
