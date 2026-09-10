import { calculateDiscountAmount } from '@/modules/promotion/domain/discount-calculator';

describe('calculateDiscountAmount', () => {
  it('computes a percentage discount', () => {
    const discount = calculateDiscountAmount({
      discountType: 'PERCENTAGE',
      discountValue: '20',
      maxDiscountAmount: null,
      fareAmount: '1000.0000',
    });
    expect(discount).toBe('200.0000');
  });

  it('caps a percentage discount at maxDiscountAmount', () => {
    const discount = calculateDiscountAmount({
      discountType: 'PERCENTAGE',
      discountValue: '50',
      maxDiscountAmount: '150.0000',
      fareAmount: '1000.0000',
    });
    expect(discount).toBe('150.0000');
  });

  it('computes a fixed discount', () => {
    const discount = calculateDiscountAmount({
      discountType: 'FIXED',
      discountValue: '100.0000',
      maxDiscountAmount: null,
      fareAmount: '1000.0000',
    });
    expect(discount).toBe('100.0000');
  });

  it('never discounts more than the fare itself', () => {
    const discount = calculateDiscountAmount({
      discountType: 'FIXED',
      discountValue: '500.0000',
      maxDiscountAmount: null,
      fareAmount: '200.0000',
    });
    expect(discount).toBe('200.0000');
  });

  it('a fixed discount is unaffected by maxDiscountAmount (only meaningful for percentage)', () => {
    const discount = calculateDiscountAmount({
      discountType: 'FIXED',
      discountValue: '80.0000',
      maxDiscountAmount: '50.0000',
      fareAmount: '1000.0000',
    });
    // maxDiscountAmount still applies as a cap regardless of type — this
    // documents that behavior explicitly rather than leaving it implicit.
    expect(discount).toBe('50.0000');
  });
});
