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

  // 1. Scheduled Ride Reminders (Rides scheduled within next 2 hours)
  const upcomingRides = await db.scheduledRide.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      customerId: true,
      pickupAddress: true,
      scheduledTime: true,
      scheduledDate: true,
      startAt: true,
    },
  });

  for (const ride of upcomingRides) {
    const targetDate = ride.scheduledDate || ride.startAt;
    if (targetDate < now || targetDate > twoHoursFromNow) {
      continue;
    }

    const formattedTime = ride.scheduledTime || targetDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // 2. Active Booking Departure Reminders (DRIVER_EN_ROUTE or DRIVER_ASSIGNED)
  const activeBookings = await db.booking.findMany({
    where: {
      status: { in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE'] },
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      customerId: true,
      pickupAddress: true,
      status: true,
      driverProfile: {
        select: {
          displayName: true,
          firstName: true,
        },
      },
    },
  });

  for (const booking of activeBookings) {
    const idempotencyKey = `reminder:booking:${booking.id}:${booking.status}`;

    const evalResult = await evaluateNotificationIntelligence(
      {
        userId: booking.customerId,
        category: 'BOOKING',
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

    const driverName =
      booking.driverProfile?.displayName || booking.driverProfile?.firstName || 'Your Chauffeur';

    await createNotification(
      {
        userId: booking.customerId,
        type: 'BOOKING_DRIVER_EN_ROUTE',
        category: 'BOOKING',
        title: `Trip Reminder: Chauffeur En Route`,
        body: `${driverName} is currently on the way to ${booking.pickupAddress.split(',')[0]}. Please be ready.`,
        actionUrl: `/customer/active-tracking?bookingId=${booking.id}`,
        priority: 'HIGH',
        idempotencyKey,
        data: {
          bookingId: booking.id,
          pickupAddress: booking.pickupAddress,
        },
      },
      db,
    );

    remindersCreated++;
    targetUserIds.push(booking.customerId);
  }

  return {
    remindersCreated,
    skippedDuplicates,
    targetUserIds: Array.from(new Set(targetUserIds)),
  };
}
