import 'server-only';
import { ScheduledRideStatus, ScheduleType, OccurrenceStatus, BookingStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { calculateEstimatedFare } from '@/modules/pricing/application/fare-calculation-service';
import { createPricingQuoteSnapshot } from '@/modules/pricing/application/pricing-quote-service';
import { validateAndReservePromotionUsage } from '@/modules/promotion/application/services/promotion-eligibility-service';
import { findAndOfferNextDriver } from '@/modules/booking/application/matching-service';
import { calculateNextOccurrence } from '../domain/recurrence-calculator';

export interface ProcessScheduledRidesResult {
  processedCount: number;
  generatedBookings: string[];
  skippedCount: number;
  failedCount: number;
}

/**
 * Idempotently evaluates and processes due scheduled rides.
 * Calculates fresh pricing, revalidates promotions, creates actual Bookings,
 * advances recurrence, and emits outbox notifications.
 */
export async function processDueScheduledRides(
  now: Date = new Date(),
  generationWindowMinutes = 30,
  batchSize = 20,
  db: Db = prisma,
): Promise<ProcessScheduledRidesResult> {
  const generationThreshold = new Date(now.getTime() + generationWindowMinutes * 60 * 1000);

  const dueRides = await db.scheduledRide.findMany({
    where: {
      status: ScheduledRideStatus.ACTIVE,
      nextOccurrenceAt: {
        lte: generationThreshold,
      },
    },
    orderBy: { nextOccurrenceAt: 'asc' },
    take: batchSize,
    include: {
      preferredDriver: true,
    },
  });

  const result: ProcessScheduledRidesResult = {
    processedCount: 0,
    generatedBookings: [],
    skippedCount: 0,
    failedCount: 0,
  };

  for (const ride of dueRides) {
    if (!ride.nextOccurrenceAt) continue;

    const occurrenceStart = ride.nextOccurrenceAt;
    const occurrenceIdempotencyKey = `${ride.id}_${occurrenceStart.toISOString()}`;

    try {
      const generatedBookingId = await db.$transaction(async (tx) => {
        // 1. Idempotency Check: Reserve occurrence log
        const existingLog = await tx.scheduledRideOccurrenceLog.findUnique({
          where: { occurrenceIdempotencyKey },
        });

        if (existingLog) {
          logger.info(
            { scheduledRideId: ride.id, occurrenceIdempotencyKey },
            'Occurrence already generated for scheduled ride; skipping.',
          );
          return null;
        }

        // 2. Calculate Fresh Pricing
        let estimatedFare = 500;
        let pricingQuote = null;

        try {
          const fareCalc = await calculateEstimatedFare(
            {
              bookingType: ride.bookingType,
              pickup: {
                latitude: ride.pickupLatitude,
                longitude: ride.pickupLongitude,
              },
              dropoff:
                ride.dropoffLatitude !== null && ride.dropoffLongitude !== null
                  ? {
                      latitude: ride.dropoffLatitude,
                      longitude: ride.dropoffLongitude,
                    }
                  : null,
            },
            tx,
          );
          estimatedFare = Number(fareCalc.breakdown.totalFareAmount);
          pricingQuote = createPricingQuoteSnapshot(ride.bookingType, fareCalc);
        } catch (err) {
          logger.warn(
            { scheduledRideId: ride.id, error: err },
            'Could not compute dynamic fare estimate; falling back to default estimate.',
          );
        }

        // 3. Create actual Booking
        const booking = await tx.booking.create({
          data: {
            customerId: ride.customerId,
            scheduledRideId: ride.id,
            preferredDriverProfileId: ride.preferredDriverProfileId || null,
            bookingType: ride.bookingType,
            status: BookingStatus.SEARCHING_DRIVER,
            pickupLatitude: ride.pickupLatitude,
            pickupLongitude: ride.pickupLongitude,
            pickupAddress: ride.pickupAddress,
            pickupLabel: ride.pickupLabel || null,
            dropoffLatitude: ride.dropoffLatitude || null,
            dropoffLongitude: ride.dropoffLongitude || null,
            dropoffAddress: ride.dropoffAddress || null,
            dropoffLabel: ride.dropoffLabel || null,
            estimatedFareAmount: estimatedFare,
            pricingSnapshot: pricingQuote ? JSON.parse(JSON.stringify(pricingQuote)) : undefined,
            requestedStartTime: occurrenceStart,
            requestedAt: now,
            searchStartedAt: now,
          },
        });

        // 4. Revalidate Promotion (if configured)
        if (ride.promotionCode) {
          try {
            const promoResult = await validateAndReservePromotionUsage(tx, {
              promotionCode: ride.promotionCode,
              userId: ride.customerId,
              bookingId: booking.id,
              fareAmount: estimatedFare.toFixed(4),
            });
            if (promoResult) {
              await tx.booking.update({
                where: { id: booking.id },
                data: {
                  promotionId: promoResult.promotionId,
                  promotionCodeSnapshot: promoResult.promotionCodeSnapshot,
                  discountAmount: promoResult.discountAmount,
                },
              });
            }
          } catch (promoErr) {
            logger.warn(
              { scheduledRideId: ride.id, promoCode: ride.promotionCode, error: promoErr },
              'Promotion revalidation failed at booking generation; creating booking without promotion.',
            );
          }
        }

        // 5. Create occurrence log record
        await tx.scheduledRideOccurrenceLog.create({
          data: {
            scheduledRideId: ride.id,
            occurrenceStart,
            occurrenceIdempotencyKey,
            bookingId: booking.id,
            status: OccurrenceStatus.GENERATED,
          },
        });

        // 6. Calculate next occurrence or complete schedule
        let nextOccurrenceAt: Date | null = null;
        let nextStatus: ScheduledRideStatus = ride.status;

        if (ride.scheduleType === ScheduleType.ONE_TIME) {
          nextStatus = ScheduledRideStatus.COMPLETED;
          nextOccurrenceAt = null;
        } else {
          nextOccurrenceAt = calculateNextOccurrence({
            scheduleType: ride.scheduleType,
            scheduledTime: ride.scheduledTime,
            scheduledDate: ride.scheduledDate ? new Date(ride.scheduledDate) : null,
            recurrenceFrequency: ride.recurrenceFrequency,
            daysOfWeek: ride.daysOfWeek,
            startAt: new Date(ride.startAt),
            endAt: ride.endAt ? new Date(ride.endAt) : null,
            fromTime: occurrenceStart,
          });

          if (!nextOccurrenceAt) {
            nextStatus = ScheduledRideStatus.COMPLETED;
          }
        }

        // 7. Update ScheduledRide record
        await tx.scheduledRide.update({
          where: { id: ride.id },
          data: {
            status: nextStatus,
            nextOccurrenceAt,
            lastGeneratedAt: now,
          },
        });

        // 8. Emit Outbox Events for Notifications & Dispatch
        await insertOutboxEvent(tx, {
          eventType: 'scheduled-ride.booking_generated',
          aggregateType: 'SCHEDULED_RIDE',
          aggregateId: ride.id,
          payload: {
            scheduledRideId: ride.id,
            bookingId: booking.id,
            customerId: ride.customerId,
            occurrenceStart: occurrenceStart.toISOString(),
          },
        });

        await insertOutboxEvent(tx, {
          eventType: 'scheduled-ride.reminder_due',
          aggregateType: 'SCHEDULED_RIDE',
          aggregateId: ride.id,
          payload: {
            scheduledRideId: ride.id,
            bookingId: booking.id,
            customerId: ride.customerId,
            pickupAddress: ride.pickupAddress,
            occurrenceStart: occurrenceStart.toISOString(),
          },
        });

        return booking.id;
      });

      if (generatedBookingId) {
        result.processedCount++;
        result.generatedBookings.push(generatedBookingId);

        // Initiate dispatch outside heavy lock
        try {
          await findAndOfferNextDriver(generatedBookingId, db);
        } catch (dispatchErr) {
          logger.error(
            { bookingId: generatedBookingId, error: dispatchErr },
            'Failed to initiate initial dispatch offer for generated scheduled booking.',
          );
        }
      } else {
        result.skippedCount++;
      }
    } catch (err) {
      result.failedCount++;
      logger.error(
        { scheduledRideId: ride.id, error: err },
        'Failed to process due occurrence for scheduled ride.',
      );

      // Record failure log idempotently
      try {
        await db.scheduledRideOccurrenceLog.create({
          data: {
            scheduledRideId: ride.id,
            occurrenceStart,
            occurrenceIdempotencyKey,
            status: OccurrenceStatus.FAILED,
            failureReason: err instanceof Error ? err.message : 'Unknown generation failure',
          },
        });
      } catch {
        // Ignore duplicate failure log writes
      }
    }
  }

  return result;
}
