import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  getUserActiveOrganization,
  createOrganization,
  updateOrganization,
} from '@/modules/corporate/domain/organization-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }) => {
  try {
    const membership = await getUserActiveOrganization(principal.userId);
    return NextResponse.json({ membership }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});

export const POST = withAuth(async (req, { principal }) => {
  try {
    const body = await req.json();
    const result = await createOrganization({
      name: body.name,
      legalName: body.legalName,
      gstin: body.gstin,
      billingEmail: body.billingEmail || 'billing@company.com',
      billingPhone: body.billingPhone,
      ownerUserId: principal.userId,
      creditLimit: body.creditLimit ? Number(body.creditLimit) : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});

export const PATCH = withAuth(async (req, { principal }) => {
  try {
    const body = await req.json();
    const membership = await getUserActiveOrganization(principal.userId);
    if (!membership) {
      return NextResponse.json(
        { error: 'No active corporate organization found' },
        { status: 404 },
      );
    }
    const updated = await updateOrganization(membership.organizationId, principal.userId, body);
    return NextResponse.json({ organization: updated }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
