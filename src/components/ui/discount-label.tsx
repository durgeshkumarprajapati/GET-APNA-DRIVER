import { formatCurrency } from '@/shared/formatting/money';

interface DiscountLabelProps {
  discountType: string;
  discountValue: string;
  maxDiscountAmount?: string | null;
  className?: string;
}

/**
 * Shared "20% OFF (up to ₹150)" / "₹100 OFF" formatter — used by both the
 * customer offers page and the admin coupons page so the discount terms
 * always read identically across the app.
 */
export function DiscountLabel({
  discountType,
  discountValue,
  maxDiscountAmount,
  className = '',
}: DiscountLabelProps) {
  if (discountType === 'PERCENTAGE') {
    const value = Number(discountValue);
    const cap = maxDiscountAmount ? ` (up to ${formatCurrency(maxDiscountAmount)})` : '';
    return (
      <span className={className}>
        {value}% OFF{cap}
      </span>
    );
  }
  return <span className={className}>{formatCurrency(discountValue)} OFF</span>;
}
