import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getUserActiveOrganization } from '@/modules/corporate/domain/organization-service';
import { listPolicies, upsertPolicy } from '@/modules/corporate/domain/corporate-policy-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }) => {
  try {
    const membership = await getUserActiveOrganization(principal.userId);
    if (!membership) {
      return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
    }
    const policies = await listPolicies(membership.organizationId);
    return NextResponse.json({ policies }, { status: 200 });
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

    const policy = await upsertPolicy(principal.userId, {
      organizationId: membership.organizationId,
      name: body.name,
      description: body.description,
      isDefault: body.isDefault,
      maxFareAmount: body.maxFareAmount !== undefined ? Number(body.maxFareAmount) : undefined,
      maxDistanceKm: body.maxDistanceKm !== undefined ? Number(body.maxDistanceKm) : undefined,
      allowedVehicleCategories: body.allowedVehicleCategories,
      requireApprovalAboveAmount: body.requireApprovalAboveAmount !== undefined ? Number(body.requireApprovalAboveAmount) : undefined,
      requireApprovalAllRides: body.requireApprovalAllRides,
      allowAdvanceBookingHours: body.allowAdvanceBookingHours !== undefined ? Number(body.allowAdvanceBookingHours) : undefined,
      allowedBookingDays: body.allowedBookingDays,
      monthlyEmployeeSpendLimit: body.monthlyEmployeeSpendLimit !== undefined ? Number(body.monthlyEmployeeSpendLimit) : undefined,
      status: body.status,
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
