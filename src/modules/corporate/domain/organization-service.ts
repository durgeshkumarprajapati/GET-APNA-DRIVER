import { prisma } from '@/shared/database/prisma';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import {
  OrganizationStatus,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  PolicyStatus,
  InvitationStatus,
} from '@prisma/client';
import crypto from 'crypto';

export interface CreateOrganizationParams {
  name: string;
  legalName?: string;
  gstin?: string;
  billingEmail: string;
  billingPhone?: string;
  domain?: string;
  ownerUserId: string;
  creditLimit?: number;
}

export interface InviteMemberParams {
  organizationId: string;
  invitedByUserId: string;
  email: string;
  role?: OrganizationMemberRole;
}

export async function createOrganization(params: CreateOrganizationParams) {
  const slug =
    params.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
      '-' +
      Math.floor(1000 + Math.random() * 9000);

  return await prisma.$transaction(async (tx) => {
    // 1. Create Organization
    const org = await tx.organization.create({
      data: {
        name: params.name,
        slug,
        legalName: params.legalName || params.name,
        gstin: params.gstin,
        billingEmail: params.billingEmail,
        billingPhone: params.billingPhone,
        domain: params.domain,
        status: OrganizationStatus.ACTIVE,
        creditLimit: params.creditLimit ?? 50000,
        currentBalance: 0,
      },
    });

    // 2. Add Owner Member
    const member = await tx.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: params.ownerUserId,
        role: OrganizationMemberRole.OWNER,
        status: OrganizationMemberStatus.ACTIVE,
        joinedAt: new Date(),
      },
    });

    // 3. Create Default Travel Policy
    await tx.organizationTravelPolicy.create({
      data: {
        organizationId: org.id,
        name: 'Standard Corporate Policy',
        description: 'Default travel policy for organization employees',
        isDefault: true,
        maxFareAmount: 5000,
        maxDistanceKm: 100,
        allowedVehicleCategories: ['SEDAN', 'HATCHBACK', 'SUV', 'LUXURY'],
        requireApprovalAboveAmount: 3000,
        requireApprovalAllRides: false,
        status: PolicyStatus.ACTIVE,
      },
    });

    // 4. Create Billing Profile
    await tx.corporateBillingProfile.create({
      data: {
        organizationId: org.id,
        legalName: params.legalName || params.name,
        billingAddress: 'Corporate HQ',
        gstin: params.gstin,
        billingEmail: params.billingEmail,
        paymentTermDays: 30,
      },
    });

    // 5. Audit Log
    await recordAuditLog(tx, {
      actorUserId: params.ownerUserId,
      action: 'ORGANIZATION_CREATE',
      entityType: 'ORGANIZATION',
      entityId: org.id,
      afterState: { name: org.name, slug: org.slug },
    });

    // 6. Outbox Event
    await insertOutboxEvent(tx, {
      aggregateType: 'ORGANIZATION',
      aggregateId: org.id,
      eventType: 'ORGANIZATION_CREATED',
      payload: {
        organizationId: org.id,
        name: org.name,
        ownerUserId: params.ownerUserId,
      },
    });

    return { organization: org, member };
  });
}

export async function getOrganizationById(id: string) {
  return await prisma.organization.findUnique({
    where: { id },
    include: {
      billingProfile: true,
      travelPolicies: true,
      departments: true,
      costCenters: true,
      _count: {
        select: { members: true, bookings: true },
      },
    },
  });
}

export async function getUserActiveOrganization(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      status: OrganizationMemberStatus.ACTIVE,
      organization: {
        status: OrganizationStatus.ACTIVE,
      },
    },
    include: {
      organization: true,
      department: true,
      costCenter: true,
    },
  });

  return membership;
}

export async function updateOrganization(
  orgId: string,
  userId: string,
  data: Partial<CreateOrganizationParams> & { status?: OrganizationStatus }
) {
  return await prisma.$transaction(async (tx) => {
    const updated = await tx.organization.update({
      where: { id: orgId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.legalName !== undefined && { legalName: data.legalName }),
        ...(data.gstin !== undefined && { gstin: data.gstin }),
        ...(data.billingEmail && { billingEmail: data.billingEmail }),
        ...(data.billingPhone !== undefined && { billingPhone: data.billingPhone }),
        ...(data.status && { status: data.status }),
      },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'ORGANIZATION_UPDATE',
      entityType: 'ORGANIZATION',
      entityId: orgId,
      afterState: data as Record<string, unknown>,
    });

    return updated;
  });
}

export async function listMembers(orgId: string) {
  return await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: {
          id: true,
          customerProfile: true,
        },
      },
      department: true,
      costCenter: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateMember(
  orgId: string,
  memberId: string,
  actorUserId: string,
  updates: {
    role?: OrganizationMemberRole;
    status?: OrganizationMemberStatus;
    employeeCode?: string;
    designation?: string;
    departmentId?: string | null;
    costCenterId?: string | null;
  }
) {
  return await prisma.$transaction(async (tx) => {
    const updated = await tx.organizationMember.update({
      where: { id: memberId, organizationId: orgId },
      data: {
        ...(updates.role && { role: updates.role }),
        ...(updates.status && { status: updates.status }),
        ...(updates.employeeCode !== undefined && { employeeCode: updates.employeeCode }),
        ...(updates.designation !== undefined && { designation: updates.designation }),
        ...(updates.departmentId !== undefined && { departmentId: updates.departmentId }),
        ...(updates.costCenterId !== undefined && { costCenterId: updates.costCenterId }),
      },
      include: { user: true, department: true, costCenter: true },
    });

    await recordAuditLog(tx, {
      actorUserId: actorUserId,
      action: 'ORGANIZATION_MEMBER_UPDATE',
      entityType: 'ORGANIZATION_MEMBER',
      entityId: memberId,
      afterState: updates as Record<string, unknown>,
    });

    return updated;
  });
}

export async function removeMember(orgId: string, memberId: string, actorUserId: string) {
  return await prisma.$transaction(async (tx) => {
    const member = await tx.organizationMember.update({
      where: { id: memberId, organizationId: orgId },
      data: {
        status: OrganizationMemberStatus.DEACTIVATED,
        removedAt: new Date(),
      },
    });

    await recordAuditLog(tx, {
      actorUserId: actorUserId,
      action: 'ORGANIZATION_MEMBER_REMOVE',
      entityType: 'ORGANIZATION_MEMBER',
      entityId: memberId,
      afterState: { organizationId: orgId },
    });

    return member;
  });
}

export async function createInvitation(params: InviteMemberParams) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.$transaction(async (tx) => {
    const inv = await tx.organizationInvitation.create({
      data: {
        organizationId: params.organizationId,
        email: params.email.toLowerCase(),
        invitedByUserId: params.invitedByUserId,
        role: params.role || OrganizationMemberRole.MEMBER,
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt,
      },
      include: { organization: true },
    });

    await insertOutboxEvent(tx, {
      aggregateType: 'ORGANIZATION_INVITATION',
      aggregateId: inv.id,
      eventType: 'ORGANIZATION_MEMBER_INVITED',
      payload: {
        invitationId: inv.id,
        organizationId: inv.organizationId,
        organizationName: inv.organization.name,
        email: inv.email,
        role: inv.role,
      },
    });

    return inv;
  });

  return { invitation, rawToken };
}

export async function acceptInvitation(userId: string, rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  return await prisma.$transaction(async (tx) => {
    const invitation = await tx.organizationInvitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });

    if (!invitation) {
      throw new Error('Invalid or expired invitation token.');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error(`Invitation is no longer pending (${invitation.status}).`);
    }

    if (invitation.expiresAt < new Date()) {
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new Error('Invitation has expired.');
    }

    // Check if user already a member
    const existing = await tx.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
    });

    let member;
    if (existing) {
      member = await tx.organizationMember.update({
        where: { id: existing.id },
        data: {
          status: OrganizationMemberStatus.ACTIVE,
          role: invitation.role,
          removedAt: null,
          joinedAt: new Date(),
        },
      });
    } else {
      member = await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
          status: OrganizationMemberStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });
    }

    // Mark invitation ACCEPTED
    await tx.organizationInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'ORGANIZATION_INVITATION_ACCEPT',
      entityType: 'ORGANIZATION_MEMBER',
      entityId: member.id,
      afterState: { organizationId: invitation.organizationId },
    });

    return { member, organization: invitation.organization };
  });
}

// Departments
export async function getDepartments(orgId: string) {
  return await prisma.organizationDepartment.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { members: true, bookings: true } } },
  });
}

export async function createDepartment(orgId: string, code: string, name: string, description?: string) {
  return await prisma.organizationDepartment.create({
    data: {
      organizationId: orgId,
      code: code.toUpperCase().trim(),
      name,
      description,
    },
  });
}

// Cost Centers
export async function getCostCenters(orgId: string) {
  return await prisma.organizationCostCenter.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { members: true, bookings: true } } },
  });
}

export async function createCostCenter(orgId: string, code: string, name: string, description?: string) {
  return await prisma.organizationCostCenter.create({
    data: {
      organizationId: orgId,
      code: code.toUpperCase().trim(),
      name,
      description,
    },
  });
}

// Billing Profile
export async function getBillingProfile(orgId: string) {
  return await prisma.corporateBillingProfile.findUnique({
    where: { organizationId: orgId },
  });
}

export async function upsertBillingProfile(
  orgId: string,
  data: {
    legalName: string;
    billingAddress: string;
    gstin?: string;
    billingEmail: string;
    paymentTermDays?: number;
  }
) {
  return await prisma.corporateBillingProfile.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      ...data,
    },
    update: data,
  });
}
