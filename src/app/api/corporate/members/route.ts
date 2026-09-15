import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  getUserActiveOrganization,
  listMembers,
  updateMember,
  removeMember,
  getDepartments,
  getCostCenters,
} from '@/modules/corporate/domain/organization-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }) => {
  try {
    const membership = await getUserActiveOrganization(principal.userId);
    if (!membership) {
      return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
    }
    const members = await listMembers(membership.organizationId);
    const departments = await getDepartments(membership.organizationId);
    const costCenters = await getCostCenters(membership.organizationId);

    return NextResponse.json({ members, departments, costCenters }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});

export const PATCH = withAuth(async (req, { principal }) => {
  try {
    const membership = await getUserActiveOrganization(principal.userId);
    if (!membership) {
      return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
    }
    const body = await req.json();
    const { memberId, action, role, status, employeeCode, designation, departmentId, costCenterId } = body;

    if (action === 'remove') {
      const removed = await removeMember(membership.organizationId, memberId, principal.userId);
      return NextResponse.json({ member: removed }, { status: 200 });
    }

    const updated = await updateMember(membership.organizationId, memberId, principal.userId, {
      role,
      status,
      employeeCode,
      designation,
      departmentId,
      costCenterId,
    });
    return NextResponse.json({ member: updated }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
