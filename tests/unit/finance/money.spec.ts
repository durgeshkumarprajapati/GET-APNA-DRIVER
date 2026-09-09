import {
  fromMinorUnits,
  isPositive,
  roundMoney,
  toDecimal,
  toMinorUnits,
  ZERO,
} from '@/modules/finance/domain/money';

describe('money helpers (precise Decimal arithmetic, never JS float)', () => {
  it('converts rupees to paise without floating-point drift', () => {
    // 19.99 * 100 would be 1998.9999999999998 in naive JS float arithmetic.
    expect(toMinorUnits(toDecimal('19.99'))).toBe(1999);
    expect(toMinorUnits(toDecimal('0.10'))).toBe(10);
    expect(toMinorUnits(toDecimal('1234.5678'))).toBe(123457); // rounds half-up to the paise
  });

  it('round-trips paise back to a rounded rupee Decimal', () => {
    expect(fromMinorUnits(1999).toFixed(4)).toBe('19.9900');
    expect(fromMinorUnits(10).toFixed(4)).toBe('0.1000');
  });

  it('rounds to exactly 4 decimal places, half-up', () => {
    expect(roundMoney(toDecimal('10.00005')).toFixed(4)).toBe('10.0001');
    expect(roundMoney(toDecimal('10.00004')).toFixed(4)).toBe('10.0000');
  });

  it('handles a value that famously loses precision as a JS float', () => {
    // 0.1 + 0.2 === 0.30000000000000004 in JS number arithmetic.
    const sum = toDecimal('0.1').add(toDecimal('0.2'));
    expect(sum.toFixed(4)).toBe('0.3000');
  });

  it('isPositive correctly rejects zero and negative amounts', () => {
    expect(isPositive(ZERO)).toBe(false);
    expect(isPositive(toDecimal('-5'))).toBe(false);
    expect(isPositive(toDecimal('0.0001'))).toBe(true);
  });
});
