import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import type { CustomerSavedPerson } from '@prisma/client';
import {
  listSavedPeople,
  createSavedPerson,
} from '@/modules/customer/application/customer-saved-people-service';
import { getCorporateSpendReport } from '../domain/corporate-reporting-service';
import { evaluateTravelPolicy, getActivePolicy } from '../domain/corporate-policy-service';
import {
  SavedFamilyRecipientDTO,
  CreateFamilyRecipientInput,
  CorporateExpenseSummaryDTO,
  EvaluateCorporatePolicyInput,
  PolicyEvaluationResultDTO,
  ConsolidatedBillingReportDTO,
} from '../domain/corporate-family-types';

function toRecipientDTO(p: CustomerSavedPerson): SavedFamilyRecipientDTO {
  return {
    id: p.id,
    fullName: p.fullName,
    phone: p.phone,
    email: p.email ?? undefined,
    relationship: p.relationship ?? undefined,
    notes: p.notes ?? undefined,
    isActive: p.isActive,
  };
}

/**
 * Lists all active family members & saved recipients for a customer. Thin
 * wrapper over customer-saved-people-service, which already owns this data
 * (and its audit logging / outbox events) for the general "book for someone
 * else" flow.
 */
export async function listFamilyRecipients(
  customerId: string,
  db: Db = prisma,
): Promise<SavedFamilyRecipientDTO[]> {
  const people = await listSavedPeople(customerId, db);
  return people.map(toRecipientDTO);
}

/**
 * Adds a new family recipient for 1-tap booking for someone else.
 */
export async function addFamilyRecipient(
  customerId: string,
  input: CreateFamilyRecipientInput,
  db: Db = prisma,
): Promise<SavedFamilyRecipientDTO> {
  const { person } = await createSavedPerson(customerId, input, null, db);
  return toRecipientDTO(person);
}

/**
 * Generates corporate expense summary and department breakdown analytics.
 * Reuses getCorporateSpendReport, which computes real spend from completed
 * bookings — a prior version fabricated department spend with Math.random().
 */
export async function getCorporateExpenseSummary(
  organizationId: string,
  db: Db = prisma,
): Promise<CorporateExpenseSummaryDTO> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  const spendReport = await getCorporateSpendReport(organizationId);

  const spendByDepartment = spendReport.departmentBreakdown.map((dept) => ({
    departmentName: dept.departmentName,
    amount: dept.spend,
    rideCount: dept.rideCount,
  }));

  return {
    organizationId: org.id,
    organizationName: org.name,
    billingCycleMonth: new Date().toISOString().substring(0, 7),
    totalSpend: spendReport.totalSpend,
    totalRides: spendReport.completedRidesCount,
    activeEmployeesCount: spendReport.totalMembersCount,
    spendByDepartment,
  };
}

/**
 * Evaluates a corporate booking request against active travel policy rules,
 * as a dry-run preview. Reuses evaluateTravelPolicy — the same engine
 * createCorporateBooking uses to decide whether a ride needs approval — so
 * this preview can never disagree with what actually happens at booking
 * time. A prior version reimplemented a much weaker fare/category-only
 * check that treated policy violations as a hard block (isAllowed: false),
 * when the real policy engine always allows the ride and instead routes it
 * to approval.
 */
export async function evaluateCorporateBookingPolicy(
  input: EvaluateCorporatePolicyInput,
): Promise<PolicyEvaluationResultDTO> {
  const [policy, result] = await Promise.all([
    getActivePolicy(input.organizationId),
    evaluateTravelPolicy({
      organizationId: input.organizationId,
      userId: input.employeeUserId,
      estimatedFare: input.estimatedFare,
      estimatedDistanceKm: input.estimatedDistanceKm ?? 0,
      vehicleCategory: input.vehicleCategory,
      scheduledTime: input.bookingTime ? new Date(input.bookingTime) : undefined,
      monthlySpentSoFar: input.monthlySpentSoFar,
    }),
  ]);

  const allowedVehicleCategories = Array.isArray(policy?.allowedVehicleCategories)
    ? (policy.allowedVehicleCategories as string[])
    : [];
  const maxFareLimit =
    policy?.maxFareAmount !== null && policy?.maxFareAmount !== undefined
      ? Number(policy.maxFareAmount)
      : undefined;

  return {
    isAllowed: result.allowed,
    approvalRequired: result.requiresApproval,
    maxFareLimit,
    allowedVehicleCategories,
    violationReason: result.violations.map((v) => v.message).join(' ') || undefined,
    autoApproved: !result.requiresApproval,
  };
}

/**
 * Generates a monthly consolidated billing report from real issued tax
 * invoices for the organization's bookings. A prior version returned
 * hardcoded figures (netAmount: 85400, totalBookings: 142, ...) regardless
 * of organization, month, or year.
 */
export async function generateConsolidatedBillingReport(
  organizationId: string,
  month: number,
  year: number,
  db: Db = prisma,
): Promise<ConsolidatedBillingReportDTO> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));

  const invoices = await db.taxInvoice.findMany({
    where: {
      booking: { organizationId },
      issuedAt: { gte: periodStart, lt: periodEnd },
    },
    select: { subtotalAmount: true, taxAmount: true, totalAmount: true },
  });

  const netAmount = invoices.reduce((sum, inv) => sum + Number(inv.subtotalAmount), 0);
  const taxAmount = invoices.reduce((sum, inv) => sum + Number(inv.taxAmount), 0);
  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const billingMonth = `${year}-${monthStr}`;

  return {
    organizationId,
    billingMonth,
    totalAmount,
    taxAmount,
    netAmount,
    totalBookings: invoices.length,
    reportDownloadUrl: `https://getapnadriver.com/api/corporate/billing/consolidated-report/pdf?orgId=${organizationId}&month=${billingMonth}`,
    generatedAt: new Date().toISOString(),
    status: 'GENERATED',
  };
}
