import {
  listFamilyRecipients,
  addFamilyRecipient,
  getCorporateExpenseSummary,
  evaluateCorporateBookingPolicy,
  generateConsolidatedBillingReport,
} from '@/modules/corporate/application/corporate-family-service';

describe('Phase 97 — Corporate & Family Experience 2.0', () => {
  it('manages saved family members & recipients for 1-tap bookings', async () => {
    const mockDb: any = {
      customerSavedPerson: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sp-1',
            fullName: 'Ananya Sharma',
            phone: '+919876543210',
            relationship: 'Spouse',
            isActive: true,
          },
        ]),
        create: jest.fn().mockResolvedValue({
          id: 'sp-2',
          fullName: 'Vikram Sharma',
          phone: '+919876543211',
          relationship: 'Father',
          isActive: true,
        }),
      },
    };

    const recipients = await listFamilyRecipients('cust-101', mockDb);
    expect(recipients.length).toBe(1);
    expect(recipients[0].fullName).toBe('Ananya Sharma');

    const newRecipient = await addFamilyRecipient(
      'cust-101',
      { fullName: 'Vikram Sharma', phone: '+919876543211', relationship: 'Father' },
      mockDb,
    );
    expect(newRecipient.fullName).toBe('Vikram Sharma');
  });

  it('aggregates corporate expense summaries and department spend breakdowns', async () => {
    const mockDb: any = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'org-77',
          name: 'Acme Corp Technologies',
          members: [{}, {}, {}],
          departments: [
            { id: 'd-1', name: 'Engineering' },
            { id: 'd-2', name: 'Sales & Operations' },
          ],
        }),
      },
    };

    const summary = await getCorporateExpenseSummary('org-77', mockDb);
    expect(summary.organizationName).toBe('Acme Corp Technologies');
    expect(summary.spendByDepartment.length).toBe(2);
    expect(summary.totalSpend).toBeGreaterThan(0);
  });

  it('evaluates corporate booking requests against travel policy rules', async () => {
    const mockDb: any = {
      organizationTravelPolicy: {
        findFirst: jest.fn().mockResolvedValue({
          maxFareAmount: '2000',
          allowedVehicleCategories: ['HATCHBACK', 'SEDAN'],
          requireApprovalAllRides: false,
        }),
      },
    };

    const allowedEval = await evaluateCorporateBookingPolicy(
      {
        organizationId: '00000000-0000-0000-0000-000000000001',
        employeeUserId: '00000000-0000-0000-0000-000000000002',
        estimatedFare: 1500,
        vehicleCategory: 'SEDAN',
      },
      mockDb,
    );
    expect(allowedEval.isAllowed).toBe(true);

    const exceededEval = await evaluateCorporateBookingPolicy(
      {
        organizationId: '00000000-0000-0000-0000-000000000001',
        employeeUserId: '00000000-0000-0000-0000-000000000002',
        estimatedFare: 2800,
        vehicleCategory: 'SEDAN',
      },
      mockDb,
    );
    expect(exceededEval.isAllowed).toBe(false);
    expect(exceededEval.violationReason).toContain('exceeds corporate policy');
  });

  it('generates consolidated monthly billing reports', async () => {
    const mockDb: any = {};
    const report = await generateConsolidatedBillingReport('org-77', 10, 2026, mockDb);

    expect(report.organizationId).toBe('org-77');
    expect(report.billingMonth).toBe('2026-10');
    expect(report.totalAmount).toBe(report.netAmount + report.taxAmount);
    expect(report.reportDownloadUrl).toContain('org-77');
  });
});
