import { Prisma } from '@prisma/client';

/**
 * Precise decimal money helpers. Every function here works in
 * Prisma.Decimal (backed by decimal.js, bundled with @prisma/client) — never
 * a JavaScript `number` — so no financial calculation in this module ever
 * touches floating point.
 */

export function toDecimal(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export const ZERO = new Prisma.Decimal(0);

/** Rounds to 4 decimal places (the schema's NUMERIC(19,4) scale), half-up. */
export function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * Converts a rupee (or other major-unit) Decimal amount to an integer count
 * of the smallest currency unit (paise for INR) that Razorpay's API expects,
 * rounding half-up.
 */
export function toMinorUnits(amount: Prisma.Decimal): number {
  return amount.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

/** Converts an integer minor-unit amount (paise) from a provider back to a rupee Decimal. */
export function fromMinorUnits(amountMinorUnits: number): Prisma.Decimal {
  return roundMoney(new Prisma.Decimal(amountMinorUnits).div(100));
}

export function isPositive(value: Prisma.Decimal): boolean {
  return value.greaterThan(ZERO);
}
