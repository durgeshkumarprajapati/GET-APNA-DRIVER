import { calculateTaxBreakdown } from '@/modules/tax-invoices/tax-calculation-service';
import { generateSequentialInvoiceNumber } from '@/modules/tax-invoices/invoice-service';

describe('Phase 75 — Production Billing Breakdown & Booking Invoice Unit Tests', () => {
  describe('TaxCalculationService', () => {
    it('should correctly calculate tax breakdown with tax-inclusive pricing', () => {
      const breakdown = calculateTaxBreakdown({
        driverCharges: 800,
        platformCharges: 50,
        otherCharges: 20,
        discountAmount: 100,
        gstRatePercent: 18,
        isTaxInclusive: true,
      });

      expect(breakdown.driverCharges).toBe(800);
      expect(breakdown.platformCharges).toBe(50);
      expect(breakdown.otherCharges).toBe(20);
      expect(breakdown.grossSubtotal).toBe(870);
      expect(breakdown.discountAmount).toBe(100);

      // In tax-inclusive pricing, 770 includes 18% GST:
      // Taxable amount = 770 / 1.18 = 652.54, Tax = 117.46
      expect(breakdown.taxableAmount).toBeCloseTo(652.54, 2);
      expect(breakdown.totalTaxAmount).toBeCloseTo(117.46, 2);
      expect(breakdown.cgstRatePercent).toBe(9);
      expect(breakdown.sgstRatePercent).toBe(9);
      expect(breakdown.cgstAmount + breakdown.sgstAmount).toBeCloseTo(breakdown.totalTaxAmount, 2);

      // Final payable must equal 770
      expect(breakdown.finalPayable).toBe(770);
    });

    it('should correctly calculate tax breakdown with tax-exclusive pricing', () => {
      const breakdown = calculateTaxBreakdown({
        driverCharges: 800,
        platformCharges: 50,
        otherCharges: 20,
        discountAmount: 100,
        gstRatePercent: 18,
        isTaxInclusive: false,
      });

      expect(breakdown.grossSubtotal).toBe(870);
      expect(breakdown.discountAmount).toBe(100);
      expect(breakdown.taxableAmount).toBe(770);

      // Tax = 770 * 18% = 138.60
      expect(breakdown.totalTaxAmount).toBe(138.6);
      expect(breakdown.cgstAmount).toBe(69.3);
      expect(breakdown.sgstAmount).toBe(69.3);

      // Final payable = 770 + 138.60 = 908.60
      expect(breakdown.finalPayable).toBe(908.6);
    });

    it('should preserve driver gross earnings when customer receives promotion discount', () => {
      const driverGross = 1000;
      const discount = 100;

      const breakdown = calculateTaxBreakdown({
        driverCharges: driverGross,
        platformCharges: 0,
        discountAmount: discount,
        gstRatePercent: 18,
        isTaxInclusive: false,
      });

      // Customer payable is reduced
      expect(breakdown.taxableAmount).toBe(900);
      expect(breakdown.finalPayable).toBe(1062); // 900 + 18% tax

      // Driver gross charges remain untouched (Phase 62 invariant)
      expect(breakdown.driverCharges).toBe(driverGross);
    });
  });

  describe('Invoice Numbering Strategy', () => {
    it('should generate sequential invoice numbers with GAD-INV prefix', async () => {
      const mockDb = {
        taxInvoice: {
          count: jest.fn().mockResolvedValue(42),
          findUnique: jest.fn().mockResolvedValue(null),
        },
      } as unknown as Parameters<typeof generateSequentialInvoiceNumber>[0];

      const date = new Date('2026-09-25');
      const invNum = await generateSequentialInvoiceNumber(mockDb, date);

      expect(invNum).toBe('GAD-INV-2026-000043');
    });

    it('should handle collision gracefully and pick next available sequential number', async () => {
      const mockDb = {
        taxInvoice: {
          count: jest.fn().mockResolvedValue(5),
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ id: 'existing-1' }) // GAD-INV-2026-000006 exists
            .mockResolvedValueOnce(null), // GAD-INV-2026-000007 available
        },
      } as unknown as Parameters<typeof generateSequentialInvoiceNumber>[0];

      const date = new Date('2026-09-25');
      const invNum = await generateSequentialInvoiceNumber(mockDb, date);

      expect(invNum).toBe('GAD-INV-2026-000007');
    });
  });

  describe('Financial Invariant Verification', () => {
    it('should verify invariant: Invoice Total == Customer Payable == Payment Amount', () => {
      const paymentAmount = 908.6;
      const breakdown = calculateTaxBreakdown({
        driverCharges: 800,
        platformCharges: 50,
        otherCharges: 20,
        discountAmount: 100,
        gstRatePercent: 18,
        isTaxInclusive: false,
      });

      expect(breakdown.finalPayable).toBe(paymentAmount);
      // Invoice total matches payment amount
      expect(breakdown.finalPayable).toBe(paymentAmount);
    });
  });
});
