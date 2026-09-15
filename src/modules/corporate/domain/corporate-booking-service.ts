import { prisma } from '@/shared/database/prisma';
import { CreateBookingInput } from '@/modules/booking/domain/types';
import { evaluateTravelPolicy } from './corporate-policy-service';
import { createApprovalRequest } from './corporate-approval-service';
import { findAndOfferNextDriver } from '@/modules/booking/application/matching-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { BookingStatus, BookingType, OrganizationMemberStatus, ApprovalStatus } from '@prisma/client';

export interface CreateCorporateBookingParams {
  organizationId: string;
  userId: string;
  bookedForUserId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessPurpose?: string;
  approvalRequestId?: string;
  bookingInput: CreateBookingInput;
  estimatedFare: number;
  estimatedDistanceKm: number;
  vehicleCategory?: string;
}

export async function createCorporateBooking(params: CreateCorporateBookingParams) {
  // 1. Verify Active Organization Membership
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: params.organizationId,
        userId: params.userId,
      },
    },
    include: { organization: true },
  });

  if (!membership || membership.status !== OrganizationMemberStatus.ACTIVE) {
    throw new Error('User is not an active member of this corporate organization.');
  }

  const effectiveDepartmentId = params.departmentId || membership.departmentId || undefined;
  const effectiveCostCenterId = params.costCenterId || membership.costCenterId || undefined;
  const targetUserForBooking = params.bookedForUserId || params.userId;
  const vehicleCategory = params.vehicleCategory || 'SEDAN';

  let validatedApprovalRequestId: string | undefined = undefined;

  // 2. Check if pre-approved request provided
  if (params.approvalRequestId) {
    const approval = await prisma.corporateApprovalRequest.findUnique({
      where: { id: params.approvalRequestId },
    });

    if (
      !approval ||
      approval.organizationId !== params.organizationId ||
      approval.status !== ApprovalStatus.APPROVED
    ) {
      throw new Error('Provided approval request is invalid or not approved.');
    }
    validatedApprovalRequestId = approval.id;
  } else {
    // 3. Evaluate Policy
    const policyResult = await evaluateTravelPolicy({
      organizationId: params.organizationId,
      userId: params.userId,
      estimatedFare: params.estimatedFare,
      estimatedDistanceKm: params.estimatedDistanceKm,
      vehicleCategory,
      scheduledTime: params.bookingInput.requestedStartTime
        ? new Date(params.bookingInput.requestedStartTime)
        : undefined,
    });

    if (policyResult.requiresApproval) {
      // Create Pending Approval Request
      const approvalRequest = await createApprovalRequest({
        organizationId: params.organizationId,
        requesterUserId: params.userId,
        bookingParameters: {
          ...params.bookingInput,
          bookedForUserId: targetUserForBooking,
          departmentId: effectiveDepartmentId,
          costCenterId: effectiveCostCenterId,
          businessPurpose: params.businessPurpose,
          estimatedFare: params.estimatedFare,
          estimatedDistanceKm: params.estimatedDistanceKm,
          vehicleCategory,
        },
        policyViolations: policyResult.violations,
        reason: params.businessPurpose || 'Corporate trip requires management approval per policy.',
      });

      return {
        requiresApproval: true,
        approvalRequest,
        booking: null,
      };
    }
  }

  // 4. Create Corporate Booking
  const bookingType = params.bookingInput.bookingType || BookingType.ONE_WAY;
  const searchTimeoutSeconds = 180;
  const searchExpiresAt = new Date(Date.now() + searchTimeoutSeconds * 1000);

  const booking = await prisma.$transaction(async (tx) => {
    const createdBooking = await tx.booking.create({
      data: {
        idempotencyKey: `corp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        customerId: targetUserForBooking,
        organizationId: params.organizationId,
        bookedForUserId: targetUserForBooking !== params.userId ? targetUserForBooking : null,
        departmentId: effectiveDepartmentId,
        costCenterId: effectiveCostCenterId,
        businessPurpose: params.businessPurpose,
        approvalRequestId: validatedApprovalRequestId,
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType,
        pickupLatitude: params.bookingInput.pickupLocation.latitude,
        pickupLongitude: params.bookingInput.pickupLocation.longitude,
        pickupAddress: params.bookingInput.pickupLocation.address,
        pickupLabel: params.bookingInput.pickupLocation.label || null,
        dropoffLatitude: params.bookingInput.dropoffLocation?.latitude || null,
        dropoffLongitude: params.bookingInput.dropoffLocation?.longitude || null,
        dropoffAddress: params.bookingInput.dropoffLocation?.address || null,
        dropoffLabel: params.bookingInput.dropoffLocation?.label || null,
        numberOfDays: params.bookingInput.numberOfDays ?? null,
        hourlyPackageHours: params.bookingInput.hourlyPackageHours ?? null,
        estimatedDistanceKm: params.estimatedDistanceKm,
        estimatedFareAmount: params.estimatedFare.toString(),
        requestedStartTime: params.bookingInput.requestedStartTime
          ? new Date(params.bookingInput.requestedStartTime)
          : null,
        customerNotes: params.bookingInput.customerNotes ?? null,
        requestedAt: new Date(),
        searchStartedAt: new Date(),
        expiresAt: searchExpiresAt,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: params.userId,
      action: 'CORPORATE_BOOKING_CREATE',
      entityType: 'BOOKING',
      entityId: createdBooking.id,
      afterState: {
        organizationId: params.organizationId,
        bookedForUserId: targetUserForBooking,
        businessPurpose: params.businessPurpose,
      },
    });

    await insertOutboxEvent(tx, {
      aggregateType: 'BOOKING',
      aggregateId: createdBooking.id,
      eventType: 'BOOKING_CREATED',
      payload: {
        bookingId: createdBooking.id,
        customerId: targetUserForBooking,
        organizationId: params.organizationId,
        bookingType,
        pickupLocation: params.bookingInput.pickupLocation,
        estimatedFareAmount: params.estimatedFare.toString(),
        expiresAt: searchExpiresAt.toISOString(),
      },
    });

    return createdBooking;
  });

  // 5. Trigger Matching
  findAndOfferNextDriver(booking.id).catch((err) => {
    console.error(`[CorporateBookingService] Error triggering initial driver matching:`, err);
  });

  return {
    requiresApproval: false,
    approvalRequest: null,
    booking,
  };
}

export async function listCorporateBookings(
  organizationId: string,
  options?: {
    departmentId?: string;
    costCenterId?: string;
    status?: BookingStatus;
    limit?: number;
  }
) {
  return await prisma.booking.findMany({
    where: {
      organizationId,
      ...(options?.departmentId && { departmentId: options.departmentId }),
      ...(options?.costCenterId && { costCenterId: options.costCenterId }),
      ...(options?.status && { status: options.status }),
    },
    include: {
      customer: { select: { id: true, customerProfile: true } },
      bookedForUser: { select: { id: true, customerProfile: true } },
      assignedDriver: { select: { id: true, displayName: true } },
      department: true,
      costCenter: true,
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
  });
}
