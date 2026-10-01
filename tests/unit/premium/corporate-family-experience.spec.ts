import type { Db } from '@/shared/database/prisma';
import {
  listFamilyRecipients,
  addFamilyRecipient,
  getCorporateExpenseSummary,
  evaluateCorporateBookingPolicy,
  generateConsolidatedBillingReport,
} from '@/modules/corporate/application/corporate-family-service';
import { listSavedPeople, createSavedPerson } from '@/modules/customer/application/customer-saved-people-service';
import { getCorporateSpendReport } from '@/modules/corporate/domain/corporate-reporting-service';
import { evaluateTravelPolicy, getActivePolicy } from '@/modules/corporate/domain/corporate-policy-service';

jest.mock('@/modules/customer/application/customer-saved-people-service', () => ({
  listSavedPeople: jest.fn(),
  createSavedPerson: jest.fn(),
}));

jest.mock('@/modules/corporate/domain/corporate-reporting-service', () => ({
  getCorporateSpendReport: jest.fn(),
}));

jest.mock('@/modules/corporate/domain/corporate-policy-service', () => ({
  evaluateTravelPolicy: jest.fn(),
  getActivePolicy: jest.fn(),
}));

const mockListSavedPeople = listSavedPeople as jest.Mock;
const mockCreateSavedPerson = createSavedPerson as jest.Mock;
const mockGetCorporateSpendReport = getCorporateSpendReport as jest.Mock;
const mockEvaluateTravelPolicy = evaluateTravelPolicy as jest.Mock;
const mockGetActivePolicy = getActivePolicy as jest.Mock;

type MockDb = Partial<Db> & Record<string, unknown>;

describe('Phase 97 — Corporate & Family Experience 2.0', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates family recipients to customer-saved-people-service rather than reimplementing it', async () => {
    mockListSavedPeople.mockResolvedValue([
      {
        id: 'sp-1',
        fullName: 'Ananya Sharma',
        phone: '+919876543210',
        email: null,
        relationship: 'Spouse',
        notes: null,
        isActive: true,
      },
    ]);
    mockCreateSavedPerson.mockResolvedValue({
      person: {
        id: 'sp-2',
        fullName: 'Vikram Sharma',
        phone: '+919876543211',
        email: null,
        relationship: 'Father',
        notes: null,
        isActive: true,
      },
      isDuplicateWarning: false,
    });

    const recipients = await listFamilyRecipients('cust-101');
    expect(mockListSavedPeople).toHaveBeenCalledWith('cust-101', expect.anything());
    expect(recipients.length).toBe(1);
    expect(recipients[0].fullName).toBe('Ananya Sharma');

    const newRecipient = await addFamilyRecipient('cust-101', {
      fullName: 'Vikram Sharma',
      phone: '+919876543211',
      relationship: 'Father',
    });
    expect(mockCreateSavedPerson).toHaveBeenCalledWith(
      'cust-101',
      { fullName: 'Vikram Sharma', phone: '+919876543211', relationship: 'Father' },
      null,
      expect.anything(),
    );
    expect(newRecipient.fullName).toBe('Vikram Sharma');
  });

  it('aggregates corporate expense summaries from real completed-booking spend, not random numbers', async () => {
    const mockDb: MockDb = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'org-77', name: 'Acme Corp Technologies' }),
      } as unknown as Db['organization'],
    };

    mockGetCorporateSpendReport.mockResolvedValue({
      totalSpend: 29400,
      completedRidesCount: 48,
      totalMembersCount: 12,
      activePoliciesCount: 1,
      departmentBreakdown: [
        { departmentId: 'd-1', departmentCode: 'ENG', departmentName: 'Engineering', spend: 18000, rideCount: 30 },
        { departmentId: 'd-2', departmentCode: 'SALES', departmentName: 'Sales & Operations', spend: 11400, rideCount: 18 },
      ],
      costCenterBreakdown: [],
      recentRides: [],
    });

    const summary = await getCorporateExpenseSummary('org-77', mockDb as Db);

    expect(mockGetCorporateSpendReport).toHaveBeenCalledWith('org-77');
    expect(summary.organizationName).toBe('Acme Corp Technologies');
    expect(summary.spendByDepartment.length).toBe(2);
    expect(summary.totalSpend).toBe(29400);
    expect(summary.totalRides).toBe(48);
    expect(summary.activeEmployeesCount).toBe(12);
  });

  it('throws when the organization does not exist', async () => {
    const mockDb: MockDb = {
      organization: { findUnique: jest.fn().mockResolvedValue(null) } as unknown as Db['organization'],
    };

    await expect(getCorporateExpenseSummary('org-missing', mockDb as Db)).rejects.toThrow(
      'Organization org-missing not found',
    );
  });

  it('evaluates corporate booking requests via the real travel policy engine (never a hard block)', async () => {
    mockGetActivePolicy.mockResolvedValue({
      maxFareAmount: '2000',
      allowedVehicleCategories: ['HATCHBACK', 'SEDAN'],
      requireApprovalAllRides: false,
    });

    mockEvaluateTravelPolicy.mockResolvedValue({
      allowed: true,
      requiresApproval: false,
      violations: [],
      policyId: 'policy-1',
      policyName: 'Standard Corporate Policy',
    });

    const allowedEval = await evaluateCorporateBookingPolicy({
      organizationId: '00000000-0000-0000-0000-000000000001',
      employeeUserId: '00000000-0000-0000-0000-000000000002',
      estimatedFare: 1500,
      vehicleCategory: 'SEDAN',
    });
    expect(allowedEval.isAllowed).toBe(true);
    expect(allowedEval.approvalRequired).toBe(false);

    mockEvaluateTravelPolicy.mockResolvedValue({
      allowed: true,
      requiresApproval: true,
      violations: [
        { rule: 'MAX_FARE_EXCEEDED', message: 'Estimated fare ₹2800 exceeds max allowed ₹2000.' },
      ],
      policyId: 'policy-1',
      policyName: 'Standard Corporate Policy',
    });

    const exceededEval = await evaluateCorporateBookingPolicy({
      organizationId: '00000000-0000-0000-0000-000000000001',
      employeeUserId: '00000000-0000-0000-0000-000000000002',
      estimatedFare: 2800,
      vehicleCategory: 'SEDAN',
    });
    // The real policy engine always allows the ride — a fare or category
    // violation routes it to approval rather than hard-blocking it.
    expect(exceededEval.isAllowed).toBe(true);
    expect(exceededEval.approvalRequired).toBe(true);
    expect(exceededEval.violationReason).toContain('exceeds max allowed');
  });

  it('generates consolidated monthly billing reports from real issued tax invoices', async () => {
    const mockDb: MockDb = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'org-77' }),
      } as unknown as Db['organization'],
      taxInvoice: {
        findMany: jest.fn().mockResolvedValue([
          { subtotalAmount: '1000.00', taxAmount: '180.00', totalAmount: '1180.00' },
          { subtotalAmount: '2000.00', taxAmount: '360.00', totalAmount: '2360.00' },
        ]),
      } as unknown as Db['taxInvoice'],
    };

    const report = await generateConsolidatedBillingReport('org-77', 10, 2026, mockDb as Db);

    expect(report.organizationId).toBe('org-77');
    expect(report.billingMonth).toBe('2026-10');
    expect(report.netAmount).toBe(3000);
    expect(report.taxAmount).toBe(540);
    expect(report.totalAmount).toBe(3540);
    expect(report.totalBookings).toBe(2);
    expect(report.reportDownloadUrl).toContain('org-77');
  });
});
