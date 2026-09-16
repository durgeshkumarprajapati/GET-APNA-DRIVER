import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getUserActiveOrganization } from '@/modules/corporate/domain/organization-service';
import {
  listCorporateBookings,
  createCorporateBooking,
} from '@/modules/corporate/domain/corporate-booking-service';
import { BookingStatus } from '@prisma/client';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }) => {
  try {
    const membership = await getUserActiveOrganization(principal.userId);
    if (!membership) {
      return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
    }

    const departmentId = req.nextUrl.searchParams.get('departmentId') || undefined;
    const costCenterId = req.nextUrl.searchParams.get('costCenterId') || undefined;
    const rawStatus = req.nextUrl.searchParams.get('status');
    const status =
      rawStatus && Object.values(BookingStatus).includes(rawStatus as BookingStatus)
        ? (rawStatus as BookingStatus)
        : undefined;

    const bookings = await listCorporateBookings(membership.organizationId, {
      departmentId,
      costCenterId,
      status,
    });

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});

export const POST = withAuth(async (req, { principal }) => {
  try {
    const membership = await getUserActiveOrganization(principal.userId);
    if (!membership) {
      return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
    }

    const body = await req.json();

    const result = await createCorporateBooking({
      organizationId: membership.organizationId,
      userId: principal.userId,
      bookedForUserId: body.bookedForUserId,
      departmentId: body.departmentId,
      costCenterId: body.costCenterId,
      businessPurpose: body.businessPurpose,
      approvalRequestId: body.approvalRequestId,
      bookingInput: body.bookingInput,
      estimatedFare: Number(body.estimatedFare || 500),
      estimatedDistanceKm: Number(body.estimatedDistanceKm || 15),
      vehicleCategory: body.vehicleCategory || 'SEDAN',
    });

    return NextResponse.json(result, { status: result.requiresApproval ? 202 : 201 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
