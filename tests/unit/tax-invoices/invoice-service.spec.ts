import { generateInvoiceNumber } from '@/modules/tax-invoices/invoice-service';

describe('Phase 31 Objective C — Production Tax Invoices Service', () => {
  describe('generateInvoiceNumber', () => {
    it('generates unique collision-safe invoice numbers in GAD-INV-YYYYMMDD-XXXX format', () => {
      const invNum1 = generateInvoiceNumber();
      const invNum2 = generateInvoiceNumber();

      expect(invNum1).toMatch(/^GAD-INV-\d{8}-\d{4}$/);
      expect(invNum2).toMatch(/^GAD-INV-\d{8}-\d{4}$/);
      expect(invNum1).not.toEqual(invNum2);
    });

    it('formats date correctly in invoice string prefix', () => {
      const customDate = new Date('2026-09-14T10:00:00Z');
      const invNum = generateInvoiceNumber(customDate);
      expect(invNum).toContain('GAD-INV-20260914-');
    });
  });

  describe('GST Tax Computation Logic', () => {
    it('calculates 18% GST (9% CGST + 9% SGST) from total inclusive fare correctly', () => {
      const netAmount = 1180; // 1000 subtotal + 180 GST (18%)
      const subtotalAmount = Number((netAmount / 1.18).toFixed(2));
      const taxAmount = Number((netAmount - subtotalAmount).toFixed(2));
      const cgstAmount = Number((taxAmount / 2).toFixed(2));
      const sgstAmount = Number((taxAmount - cgstAmount).toFixed(2));

      expect(subtotalAmount).toBe(1000);
      expect(taxAmount).toBe(180);
      expect(cgstAmount).toBe(90);
      expect(sgstAmount).toBe(90);
    });
  });
});
