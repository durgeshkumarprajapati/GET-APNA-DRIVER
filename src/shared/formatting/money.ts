/**
 * Client-safe display formatting for a Decimal-as-string amount already
 * computed server-side (see modules/finance/domain/money.ts for the actual
 * arithmetic — this module only ever formats, never calculates).
 */
export function formatCurrency(amount: string | number, currency: string = 'INR'): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  return `${symbol}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
