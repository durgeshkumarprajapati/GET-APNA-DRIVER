import { prisma } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { PolicyStatus, Prisma } from '@prisma/client';

export interface PolicyEvaluationParams {
  organizationId: string;
  userId: string;
  estimatedFare: number;
  estimatedDistanceKm: number;
  vehicleCategory: string;
  scheduledTime?: Date;
  monthlySpentSoFar?: number;
}

export interface PolicyViolation {
  rule: string;
  message: string;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  requiresApproval: boolean;
  violations: PolicyViolation[];
  policyId: string | null;
  policyName: string | null;
}

export interface UpsertPolicyParams {
  organizationId: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  maxFareAmount?: number | null;
  maxDistanceKm?: number | null;
  allowedVehicleCategories?: string[] | null;
  requireApprovalAboveAmount?: number | null;
  requireApprovalAllRides?: boolean;
  allowAdvanceBookingHours?: number | null;
  allowedBookingDays?: number[] | null;
  monthlyEmployeeSpendLimit?: number | null;
  status?: PolicyStatus;
}

export async function getActivePolicy(organizationId: string) {
  const policy = await prisma.organizationTravelPolicy.findFirst({
    where: {
      organizationId,
      status: PolicyStatus.ACTIVE,
    },
    orderBy: { isDefault: 'desc' },
  });
  return policy;
}

export async function listPolicies(organizationId: string) {
  return await prisma.organizationTravelPolicy.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function upsertPolicy(userId: string, params: UpsertPolicyParams) {
  return await prisma.$transaction(async (tx) => {
    if (params.isDefault) {
      // Clear previous default
      await tx.organizationTravelPolicy.updateMany({
        where: { organizationId: params.organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const policy = await tx.organizationTravelPolicy.create({
      data: {
        organizationId: params.organizationId,
        name: params.name,
        description: params.description,
        isDefault: params.isDefault ?? true,
        maxFareAmount: params.maxFareAmount !== undefined ? (params.maxFareAmount !== null ? new Prisma.Decimal(params.maxFareAmount) : null) : null,
        maxDistanceKm: params.maxDistanceKm ?? null,
        allowedVehicleCategories: params.allowedVehicleCategories ? (params.allowedVehicleCategories as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        requireApprovalAboveAmount: params.requireApprovalAboveAmount !== undefined ? (params.requireApprovalAboveAmount !== null ? new Prisma.Decimal(params.requireApprovalAboveAmount) : null) : null,
        requireApprovalAllRides: params.requireApprovalAllRides ?? false,
        allowAdvanceBookingHours: params.allowAdvanceBookingHours ?? null,
        allowedBookingDays: params.allowedBookingDays ? (params.allowedBookingDays as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        monthlyEmployeeSpendLimit: params.monthlyEmployeeSpendLimit !== undefined ? (params.monthlyEmployeeSpendLimit !== null ? new Prisma.Decimal(params.monthlyEmployeeSpendLimit) : null) : null,
        status: params.status || PolicyStatus.ACTIVE,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'ORGANIZATION_POLICY_UPSERT',
      entityType: 'ORGANIZATION_TRAVEL_POLICY',
      entityId: policy.id,
      afterState: { organizationId: params.organizationId, name: policy.name },
    });

    return policy;
  });
}

export async function evaluateTravelPolicy(
  params: PolicyEvaluationParams
): Promise<PolicyEvaluationResult> {
  const policy = await getActivePolicy(params.organizationId);

  if (!policy) {
    // Default open policy if none configured
    return {
      allowed: true,
      requiresApproval: false,
      violations: [],
      policyId: null,
      policyName: 'Default Open Policy',
    };
  }

  const violations: PolicyViolation[] = [];
  let requiresApproval = policy.requireApprovalAllRides;

  // 1. Max fare limit check
  if (policy.maxFareAmount !== null && policy.maxFareAmount !== undefined) {
    const maxFare = Number(policy.maxFareAmount);
    if (params.estimatedFare > maxFare) {
      violations.push({
        rule: 'MAX_FARE_EXCEEDED',
        message: `Estimated fare ₹${params.estimatedFare} exceeds max allowed ₹${maxFare}.`,
      });
      requiresApproval = true;
    }
  }

  // 2. Max distance check
  if (policy.maxDistanceKm !== null && policy.maxDistanceKm !== undefined) {
    if (params.estimatedDistanceKm > policy.maxDistanceKm) {
      violations.push({
        rule: 'MAX_DISTANCE_EXCEEDED',
        message: `Trip distance ${params.estimatedDistanceKm} km exceeds policy limit of ${policy.maxDistanceKm} km.`,
      });
      requiresApproval = true;
    }
  }

  // 3. Vehicle Category check
  if (policy.allowedVehicleCategories) {
    const categories = Array.isArray(policy.allowedVehicleCategories)
      ? (policy.allowedVehicleCategories as string[])
      : [];
    if (categories.length > 0 && !categories.includes(params.vehicleCategory.toUpperCase())) {
      violations.push({
        rule: 'RESTRICTED_VEHICLE_CATEGORY',
        message: `Vehicle category ${params.vehicleCategory} is not permitted under policy.`,
      });
      requiresApproval = true;
    }
  }

  // 4. Approval required above amount threshold
  if (policy.requireApprovalAboveAmount !== null && policy.requireApprovalAboveAmount !== undefined) {
    const threshold = Number(policy.requireApprovalAboveAmount);
    if (params.estimatedFare >= threshold) {
      requiresApproval = true;
    }
  }

  // 5. Booking day restriction
  if (policy.allowedBookingDays && params.scheduledTime) {
    const allowedDays = Array.isArray(policy.allowedBookingDays)
      ? (policy.allowedBookingDays as number[])
      : [];
    const dayOfWeek = params.scheduledTime.getDay(); // 0 = Sun, 1 = Mon ...
    if (allowedDays.length > 0 && !allowedDays.includes(dayOfWeek)) {
      violations.push({
        rule: 'RESTRICTED_BOOKING_DAY',
        message: `Bookings are not permitted on this day of the week under corporate policy.`,
      });
      requiresApproval = true;
    }
  }

  // 6. Monthly spend limit
  if (policy.monthlyEmployeeSpendLimit !== null && policy.monthlyEmployeeSpendLimit !== undefined && params.monthlySpentSoFar !== undefined) {
    const limit = Number(policy.monthlyEmployeeSpendLimit);
    if (params.monthlySpentSoFar + params.estimatedFare > limit) {
      violations.push({
        rule: 'MONTHLY_SPEND_LIMIT_EXCEEDED',
        message: `Monthly travel spend limit of ₹${limit} will be exceeded with this booking.`,
      });
      requiresApproval = true;
    }
  }

  return {
    allowed: true, // Ride is allowed subject to approval or directly
    requiresApproval,
    violations,
    policyId: policy.id,
    policyName: policy.name,
  };
}
