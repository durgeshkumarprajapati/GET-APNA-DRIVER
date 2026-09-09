import { formatCurrency } from '@/shared/formatting/money';

interface FinanceAmountProps {
  value: string | number;
  accent?: 'default' | 'positive' | 'negative';
  className?: string;
}

const ACCENT_CLASS: Record<NonNullable<FinanceAmountProps['accent']>, string> = {
  default: 'text-[#dfe2ee]',
  positive: 'text-[#68dba9]',
  negative: 'text-[#ffb4ab]',
};

/**
 * Shared money-value renderer — wraps the existing display-only
 * formatCurrency (shared/formatting/money.ts) with the app's accent-color
 * convention, so finance pages don't each re-derive their own "is this a
 * good or bad number" coloring logic.
 */
export function FinanceAmount({ value, accent = 'default', className = '' }: FinanceAmountProps) {
  return (
    <span className={`font-mono ${ACCENT_CLASS[accent]} ${className}`}>
      {formatCurrency(value)}
    </span>
  );
}
