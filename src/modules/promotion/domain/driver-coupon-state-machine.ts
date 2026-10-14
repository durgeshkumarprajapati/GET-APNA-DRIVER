import { InvalidDriverCouponStatusTransitionError } from './driver-coupon-errors';
import type { DriverCouponStatus } from './driver-coupon-types';

/**
 * DRAFT -> ACTIVE (publish) -> PAUSED <-> ACTIVE (pause/resume) -> ARCHIVED,
 * or ACTIVE/PAUSED -> ARCHIVED directly. Identical shape to
 * promotion-state-machine.ts's VALID_TRANSITIONS — ARCHIVED is terminal (an
 * admin creates a new coupon rather than reviving an archived one).
 */
const VALID_TRANSITIONS: Record<DriverCouponStatus, readonly DriverCouponStatus[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['PAUSED', 'ARCHIVED'],
  PAUSED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: [],
};

export function validateDriverCouponStatusTransition(
  currentStatus: DriverCouponStatus,
  targetStatus: DriverCouponStatus,
): void {
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidDriverCouponStatusTransitionError(currentStatus, targetStatus);
  }
}

/** A coupon is only redeemable while ACTIVE and within its date window. */
export function isDriverCouponCurrentlyUsable(
  status: DriverCouponStatus,
  startsAt: Date,
  endsAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (status !== 'ACTIVE') {
    return false;
  }
  if (now < startsAt) {
    return false;
  }
  if (endsAt && now > endsAt) {
    return false;
  }
  return true;
}

/** Only a coupon that has never gone live may still have its terms edited. */
export function isDriverCouponEditable(status: DriverCouponStatus): boolean {
  return status === 'DRAFT';
}
