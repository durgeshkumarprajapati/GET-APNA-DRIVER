import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  GrowthExperimentReportDTO,
  ExperimentFunnelMetricDTO,
  GrowthFunnelStep,
} from '../../domain/growth-experimentation-types';

/**
 * Phase 110 — Growth Experimentation Service
 * Tracks full funnel conversion: Exposure ➔ Interaction ➔ Booking Started ➔ Booking Completed ➔ Service Completed ➔ Repeat Booking.
 * Optimizes for completed services and retention rather than clickthrough rates alone.
 *
 * A prior version returned entirely invented numbers (10000 exposures,
 * a claimed "+18.4% completed service lift" winning variant) with no
 * database query at all — there is no exposure/interaction event-tracking
 * table anywhere in this schema (that would require front-end
 * instrumentation this platform doesn't have yet), so EXPOSURE/INTERACTION
 * are honestly reported as untracked rather than fabricated. The booking-
 * lifecycle steps (BOOKING_STARTED through REPEAT_BOOKING) ARE real,
 * computed from actual Booking rows. No "winning variant" is claimed,
 * since there's no real per-variant assignment tracking tied to these
 * counts to compare against.
 */
export async function trackAndGetGrowthExperimentReport(
  experimentKey = 'exp_booking_cta_v3',
  db: Db = prisma,
): Promise<GrowthExperimentReportDTO> {
  const steps: GrowthFunnelStep[] = [
    'EXPOSURE',
    'INTERACTION',
    'BOOKING_STARTED',
    'BOOKING_COMPLETED',
    'SERVICE_COMPLETED',
    'REPEAT_BOOKING',
  ];

  const [bookingStarted, bookingCompleted, repeatCustomers] = await Promise.all([
    db.booking.count(),
    db.booking.count({ where: { status: 'TRIP_COMPLETED' } }),
    db.booking.groupBy({
      by: ['customerId'],
      where: { status: 'TRIP_COMPLETED' },
      _count: { _all: true },
      having: { customerId: { _count: { gt: 1 } } },
    }),
  ]);

  const counts: Record<GrowthFunnelStep, number> = {
    // Not tracked anywhere — no event-instrumentation table exists for
    // pre-booking funnel steps.
    EXPOSURE: 0,
    INTERACTION: 0,
    BOOKING_STARTED: bookingStarted,
    BOOKING_COMPLETED: bookingCompleted,
    // Booking and "service" completion are the same real event in this
    // schema (TRIP_COMPLETED) — no separate post-service milestone exists.
    SERVICE_COMPLETED: bookingCompleted,
    REPEAT_BOOKING: repeatCustomers.length,
  };

  const funnelBreakdown: ExperimentFunnelMetricDTO[] = steps.map((step, idx) => {
    const count = counts[step];
    const prevCount = idx > 0 ? counts[steps[idx - 1]] : count;
    const conversion = prevCount > 0 ? Number(((count / prevCount) * 100).toFixed(1)) : 0;

    return {
      // 'control' — no real per-user variant bucketing is tied to these
      // counts, so this reports the one real population, not a specific
      // treatment arm.
      experimentKey,
      variant: 'control',
      step,
      count,
      conversionFromPreviousStepPercent: conversion,
    };
  });

  return {
    experimentKey,
    experimentTitle: 'Booking CTA & Prefill Optimization Experiment',
    primaryMetric: 'Completed Services & Repeat Booking Rate',
    totalExposures: 0,
    funnelBreakdown,
  };
}
