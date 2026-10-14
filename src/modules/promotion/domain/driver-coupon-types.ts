import type { DriverCouponStatus } from '@prisma/client';

export type { DriverCouponStatus };

export interface DriverCouponSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  creditAmount: string;
  status: DriverCouponStatus;
  /** True when status is ACTIVE but endsAt has passed — see driver-coupon-state-machine.ts. */
  isExpired: boolean;
  startsAt: string;
  endsAt: string | null;
  totalUsageLimit: number | null;
  totalUsageCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverCouponRedemptionSummary {
  id: string;
  driverCouponId: string;
  driverProfileId: string;
  creditAmountSnapshot: string;
  createdAt: string;
}
