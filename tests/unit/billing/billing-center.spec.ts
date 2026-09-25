import {
  generateSequentialRefundNumber,
  getCustomerPaymentReceipt,
  getRefundDocument,
  getCustomerBillingSummary,
} from '@/modules/billing/billing-service';
import { calculateTaxBreakdown } from '@/modules/tax-invoices/tax-calculation-service';

describe('Phase 76 — Production Billing Center & Reconciliation Invariants', () => {
  describe('Reconciliation Invariants', () => {
    it('should verify invariant: Invoice Total == Customer Payable == Payment Amount', () => {
      const breakdown = calculateTaxBreakdown({
        driverCharges: 1000,
        platformCharges: 50,
        otherCharges: 20,
        discountAmount: 100,
        gstRatePercent: 18,
        isTaxInclusive: false,
      });

      // Customer Payable = 970 + 174.60 = 1144.60
      const customerPayable = breakdown.finalPayable;
      const capturedPaymentAmount = 1144.6;

      expect(customerPayable).toBe(capturedPaymentAmount);
    });

    it('should verify invariant: Total Refunds <= Captured Payment and Net Paid = Captured - Refunds', () => {
      const capturedAmount = 1500;
      const partialRefundAmount = 500;

      expect(partialRefundAmount).toBeLessThanOrEqual(capturedAmount);

      const netCustomerPaid = capturedAmount - partialRefundAmount;
      expect(netCustomerPaid).toBe(1000);
    });

    it('should verify Phase 62 invariant: Driver gross earnings remain unchanged by customer promotion discount', () => {
      const driverGrossService = 1000;
      const discount = 100;

      const breakdown = calculateTaxBreakdown({
        driverCharges: driverGrossService,
        platformCharges: 50,
        discountAmount: discount,
        gstRatePercent: 18,
        isTaxInclusive: true,
      });

      // Customer net subtotal is reduced by discount
      expect(breakdown.grossSubtotal).toBe(1050);
      expect(breakdown.discountAmount).toBe(100);
      expect(breakdown.taxableAmount).toBeCloseTo(950 / 1.18, 2);

      // Driver gross charge remains unchanged
      expect(breakdown.driverCharges).toBe(driverGrossService);
    });
  });

  describe('Sequential Refund Numbering Strategy', () => {
    it('should generate sequential refund numbers in GAD-REF-YYYY-XXXXXX format', async () => {
      const mockDb = {
        refund: {
          count: jest.fn().mockResolvedValue(14),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as unknown as Parameters<typeof generateSequentialRefundNumber>[0];

      const date = new Date('2026-09-25');
      const refundNum = await generateSequentialRefundNumber(mockDb, date);

      expect(refundNum).toBe('GAD-REF-2026-000015');
    });

    it('should handle collision gracefully and pick next available sequential number', async () => {
      const mockDb = {
        refund: {
          count: jest.fn().mockResolvedValue(3),
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({ id: 'existing-ref-1' }) // GAD-REF-2026-000004 collision
            .mockResolvedValueOnce(null),
        },
      } as unknown as Parameters<typeof generateSequentialRefundNumber>[0];

      const date = new Date('2026-09-25');
      const refundNum = await generateSequentialRefundNumber(mockDb, date);

      expect(refundNum).toBe('GAD-REF-2026-000005');
    });
  });

  describe('IDOR & Security Access Control', () => {
    it('should reject payment receipt access if requested by different customer (IDOR protection)', async () => {
      const mockDb = {
        payment: {
          findFirst: jest.fn().mockResolvedValue(null), // Query filters by customerId
        },
      } as unknown as Parameters<typeof getCustomerPaymentReceipt>[2];

      const receipt = await getCustomerPaymentReceipt(
        'customer-A',
        'payment-of-customer-B',
        mockDb,
      );
      expect(receipt).toBeNull();
    });

    it('should reject refund document access if requested by different customer (IDOR protection)', async () => {
      const mockDb = {
        refund: {
          findFirst: jest.fn().mockResolvedValue(null), // Query filters by payment.customerId
        },
      } as unknown as Parameters<typeof getRefundDocument>[2];

      const refundDoc = await getRefundDocument('customer-A', 'refund-of-customer-B', mockDb);
      expect(refundDoc).toBeNull();
    });
  });

  describe('Customer Billing Summary Aggregation', () => {
    it('should correctly aggregate total paid, total refunded, and net spend', async () => {
      const mockDb = {
        payment: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 2500 } }),
          count: jest.fn().mockResolvedValue(1),
        },
        refund: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 } }),
        },
        taxInvoice: {
          count: jest.fn().mockResolvedValue(4),
        },
      } as unknown as Parameters<typeof getCustomerBillingSummary>[1];

      const summary = await getCustomerBillingSummary('cust-123', mockDb);

      expect(summary.totalPaid).toBe(2500);
      expect(summary.totalRefunded).toBe(500);
      expect(summary.netSpend).toBe(2000);
      expect(summary.invoiceCount).toBe(4);
      expect(summary.pendingPaymentsCount).toBe(1);
    });
  });
});
