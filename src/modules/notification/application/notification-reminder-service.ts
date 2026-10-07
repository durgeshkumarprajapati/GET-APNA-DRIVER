import { prisma, type Db } from '@/shared/database/prisma';
import { createNotification } from './notification-service';
import { ReminderGenerationResult } from '../domain/notification-intelligence-types';
import { evaluateNotificationIntelligence } from './notification-intelligence-service';

/**
 * Scans upcoming scheduled rides and active bookings to generate timely reminders
 * while enforcing deduplication and notification intelligence rules.
 */
export async function generateBookingAndScheduleReminders(
  db: Db = prisma,
): Promise<ReminderGenerationResult> {
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const targetUserIds: string[] = [];
  let remindersCreated = 0;
  let skippedDuplicates = 0;

  // 1. Scheduled Ride Reminders (next occurrence due within the next 2 hours)
  // nextOccurrenceAt is the actual next pickup instant the scheduling engine
  // computed for BOTH one-time and recurring rides — scheduledDate is only
  // the date part of a one-time ride's original input (the time of day
  // lives in the separate scheduledTime string) and is null for recurring
  // rides, and startAt is when the schedule itself starts, not its next
  // occurrence, so neither is the right value to compare against "now".
  const upcomingRides = await db.scheduledRide.findMany({
    where: {
      status: 'ACTIVE',
      nextOccurrenceAt: { gte: now, lte: twoHoursFromNow },
    },
    select: {
      id: true,
      customerId: true,
      pickupAddress: true,
      nextOccurrenceAt: true,
      timezone: true,
    },
  });

  for (const ride of upcomingRides) {
    const targetDate = ride.nextOccurrenceAt;
    if (!targetDate) continue;

    const formattedTime = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: ride.timezone,
    }).format(targetDate);
    const dateKey = targetDate.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const idempotencyKey = `reminder:scheduled:${ride.id}:${dateKey}`;

    const evalResult = await evaluateNotificationIntelligence(
      {
        userId: ride.customerId,
        category: 'SCHEDULED_RIDE',
        priority: 'HIGH',
        idempotencyKey,
        currentTime: now,
      },
      db,
    );

    if (!evalResult.allowed) {
      if (evalResult.suppressedReason === 'DUPLICATE_IDEMPOTENCY') {
        skippedDuplicates++;
      }
      continue;
    }

    await createNotification(
      {
        userId: ride.customerId,
        type: 'SCHEDULED_RIDE_REMINDER',
        category: 'SCHEDULED_RIDE',
        title: `Upcoming Ride Reminder (${formattedTime})`,
        body: `Your scheduled driver service from ${ride.pickupAddress.split(',')[0]} is set for ${formattedTime}.`,
        actionUrl: `/customer/scheduled-rides/${ride.id}`,
        priority: 'HIGH',
        idempotencyKey,
        data: {
          scheduledRideId: ride.id,
          pickupAddress: ride.pickupAddress,
          scheduledTime: formattedTime,
        },
      },
      db,
    );

    remindersCreated++;
    targetUserIds.push(ride.customerId);
  }

  // Active-booking "driver en route" reminders are deliberately not
  // duplicated here — src/worker/jobs/notification-event-handlers.ts
  // already sends BOOKING_DRIVER_EN_ROUTE in real time off the
  // 'booking.driver.en_route' outbox event the moment the status actually
  // transitions. A polling duplicate here fired on every ACTIVE
  // DRIVER_ASSIGNED or DRIVER_EN_ROUTE booking, saying "is currently on the
  // way" even for ones still only DRIVER_ASSIGNED (not yet moving), under a
  // different idempotency key than the real-time event — customers got the
  // same message twice, one of them factually wrong.

  return {
    remindersCreated,
    skippedDuplicates,
    targetUserIds: Array.from(new Set(targetUserIds)),
  };
}
