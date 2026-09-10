import Link from 'next/link';
import { FinanceAmount } from './finance-amount';
import { StatusBadge, type StatusBadgeTone } from './status-badge';
import { formatDateTime } from '@/shared/formatting/date';

export interface WalletTransactionItemData {
  id: string;
  type: 'BOOKING_PAYMENT' | 'REFUND' | 'REFERRAL_REWARD';
  direction: 'CREDIT' | 'DEBIT';
  amount: string;
  currency: string;
  status: string;
  description: string;
  occurredAt: string;
  bookingId: string | null;
  paymentId: string | null;
  discountAmount: string | null;
}

const TYPE_LABEL: Record<WalletTransactionItemData['type'], string> = {
  BOOKING_PAYMENT: 'Booking Payment',
  REFUND: 'Refund',
  REFERRAL_REWARD: 'Referral Reward',
};

const TYPE_ICON: Record<WalletTransactionItemData['type'], string> = {
  BOOKING_PAYMENT: 'local_taxi',
  REFUND: 'replay',
  REFERRAL_REWARD: 'featured_seasonal_and_gifts',
};

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  CAPTURED: 'success',
  PARTIALLY_REFUNDED: 'warning',
  REFUNDED: 'warning',
  PROCESSED: 'success',
  REWARDED: 'success',
};

/**
 * Mobile-first card row for a single wallet transaction — used instead of
 * forcing the desktop DataTable into a horizontally-scrolling layout on
 * narrow viewports (per Phase 23's responsive requirement). Purely
 * presentational: direction/amount/reference are all pre-computed
 * server-side by customer-wallet-service.ts, never derived here.
 */
export function WalletTransactionItem({ tx }: { tx: WalletTransactionItemData }) {
  const href = tx.paymentId ? `/payments/${tx.paymentId}` : null;
  const content = (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-[#181c24] border border-[#262a33]">
      <span className="material-symbols-outlined text-xl text-[#68dba9] shrink-0 mt-0.5">
        {TYPE_ICON[tx.type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] truncate">
            {TYPE_LABEL[tx.type]}
          </span>
          <FinanceAmount
            value={tx.direction === 'DEBIT' ? `-${tx.amount}` : `+${tx.amount}`}
            accent={tx.direction === 'DEBIT' ? 'negative' : 'positive'}
            className="text-sm font-bold shrink-0"
          />
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-[10px] text-[#87948b] font-mono truncate">
            {formatDateTime(tx.occurredAt)}
            {tx.bookingId ? ` · Booking #${tx.bookingId.slice(0, 8).toUpperCase()}` : ''}
          </span>
          <StatusBadge label={tx.status} tone={STATUS_TONE[tx.status] ?? 'neutral'} />
        </div>
        {tx.discountAmount && (
          <span className="text-[10px] text-[#68dba9] mt-1 block">
            Promo discount applied: {tx.discountAmount}
          </span>
        )}
      </div>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block hover:opacity-90 transition-opacity">
      {content}
    </Link>
  );
}
