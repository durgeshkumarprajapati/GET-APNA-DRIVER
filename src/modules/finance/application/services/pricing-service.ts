import 'server-only';
import type { Booking } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getString } from '@/shared/config/configuration-service';
import { roundMoney, toDecimal } from '../../domain/money';

export interface BookingAmountResult {
  amount: string;
  breakdown: {
    baseFareAmount: string;
    perMinuteRate: string;
    estimatedDurationMinutes: number | null;
    minimumFareAmount: string;
  };
}

/**
 * Calculates the amount to charge for a booking. This is a deliberately
 * minimal, duration-based placeholder — the booking domain has no
 * distance/route computation to price against yet (only lat/lng snapshots),
 * so a real fare engine (distance-based, surge, vehicle class, etc.) is
 * out of scope for this phase and belongs to a dedicated Pricing phase.
 * The result and the SystemConfiguration values used to compute it are
 * meant to be persisted as a snapshot on the Payment record at creation
 * time (see payment-service.ts) — a later configuration change must never
 * retroactively change an already-created payment's amount.
 */
export async function calculateBookingAmount(
  booking: Partial<Booking> & { estimatedDurationMinutes?: number | null },
  db: Db = prisma,
): Promise<BookingAmountResult> {
  // If Phase 15 pricing engine calculated an explicit final or estimated fare amount on the booking
  if (booking.finalFareAmount) {
    const amt = toDecimal(booking.finalFareAmount.toString());
    return {
      amount: roundMoney(amt).toFixed(4),
      breakdown: {
        baseFareAmount: roundMoney(amt).toFixed(4),
        perMinuteRate: '0.0000',
        estimatedDurationMinutes: booking.estimatedDurationMinutes ?? null,
        minimumFareAmount: roundMoney(amt).toFixed(4),
      },
    };
  }

  if (booking.estimatedFareAmount) {
    const amt = toDecimal(booking.estimatedFareAmount.toString());
    return {
      amount: roundMoney(amt).toFixed(4),
      breakdown: {
        baseFareAmount: roundMoney(amt).toFixed(4),
        perMinuteRate: '0.0000',
        estimatedDurationMinutes: booking.estimatedDurationMinutes ?? null,
        minimumFareAmount: roundMoney(amt).toFixed(4),
      },
    };
  }

  const [baseFareRaw, perMinuteRateRaw, minimumFareRaw] = await Promise.all([
    getString('finance.pricing.base_fare_amount', '100.0000', db),
    getString('finance.pricing.per_minute_rate', '3.0000', db),
    getString('finance.pricing.minimum_fare_amount', '100.0000', db),
  ]);

  const baseFare = toDecimal(baseFareRaw);
  const perMinuteRate = toDecimal(perMinuteRateRaw);
  const minimumFare = toDecimal(minimumFareRaw);

  let amount = baseFare;
  if (booking.estimatedDurationMinutes && booking.estimatedDurationMinutes > 0) {
    amount = amount.add(perMinuteRate.mul(booking.estimatedDurationMinutes));
  }
  if (amount.lessThan(minimumFare)) {
    amount = minimumFare;
  }

  return {
    amount: roundMoney(amount).toFixed(4),
    breakdown: {
      baseFareAmount: roundMoney(baseFare).toFixed(4),
      perMinuteRate: roundMoney(perMinuteRate).toFixed(4),
      estimatedDurationMinutes: booking.estimatedDurationMinutes ?? null,
      minimumFareAmount: roundMoney(minimumFare).toFixed(4),
    },
  };
}

export interface CommissionResult {
  commissionPercentage: string;
  commissionAmount: string;
  driverEarningsAmount: string;
}

/**
 * Splits a captured gross amount into platform commission and driver
 * earnings using precise Decimal arithmetic. Rounds the commission to 4
 * decimal places and gives the driver the exact remainder, so
 * commission + driverEarnings always equals the gross amount to the cent
 * (required for the ledger posting to balance).
 */
export async function calculateCommission(
  grossAmount: string,
  db: Db = prisma,
): Promise<CommissionResult> {
  const commissionPercentageRaw = await getString(
    'finance.platform_commission_percentage',
    '20.0000',
    db,
  );
  const commissionPercentage = toDecimal(commissionPercentageRaw);
  const gross = toDecimal(grossAmount);

  const commissionAmount = roundMoney(gross.mul(commissionPercentage).div(100));
  const driverEarningsAmount = roundMoney(gross.sub(commissionAmount));

  return {
    commissionPercentage: commissionPercentage.toFixed(4),
    commissionAmount: commissionAmount.toFixed(4),
    driverEarningsAmount: driverEarningsAmount.toFixed(4),
  };
}
