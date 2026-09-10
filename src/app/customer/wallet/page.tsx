'use client';

import { useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FinanceAmount } from '@/components/ui/finance-amount';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import {
  WalletTransactionItem,
  type WalletTransactionItemData,
} from '@/components/ui/wallet-transaction-item';
import { formatCurrency } from '@/shared/formatting/money';
import { formatDateTime } from '@/shared/formatting/date';

type WalletFilter = 'all' | 'credit' | 'debit' | 'booking_payment' | 'refund' | 'referral_reward';

const FILTERS: { value: WalletFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'debit', label: 'Debits' },
  { value: 'credit', label: 'Credits' },
  { value: 'booking_payment', label: 'Booking Payments' },
  { value: 'refund', label: 'Refunds' },
  { value: 'referral_reward', label: 'Referral Rewards' },
];

interface WalletSummary {
  totalCredits: string;
  totalDebits: string;
  totalRefunds: string;
  totalReferralRewards: string;
}

interface WalletResponse {
  balance: string;
  currency: string;
  summary: WalletSummary;
  transactions: WalletTransactionItemData[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  CAPTURED: 'success',
  PARTIALLY_REFUNDED: 'warning',
  REFUNDED: 'warning',
  PROCESSED: 'success',
  REWARDED: 'success',
};

const TYPE_LABEL: Record<WalletTransactionItemData['type'], string> = {
  BOOKING_PAYMENT: 'Booking Payment',
  REFUND: 'Refund',
  REFERRAL_REWARD: 'Referral Reward',
};

const PAGE_SIZE = 10;

export default function CustomerWalletPage() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<WalletFilter>('all');
  const [page, setPage] = useState(1);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/customer/wallet?page=${page}&pageSize=${PAGE_SIZE}&type=${filter}`,
        );
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setWallet(data.wallet);
          setError(null);
        } else {
          setError('Unable to load wallet.');
        }
      } catch {
        if (isMounted) setError('Unable to load wallet.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [filter, page, retryToken]);

  const handleFilterChange = (next: WalletFilter) => {
    setFilter(next);
    setPage(1);
  };

  const columns: DataTableColumn<WalletTransactionItemData>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (tx) => <span className="text-[#87948b]">{formatDateTime(tx.occurredAt)}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (tx) => (
        <div className="flex flex-col">
          <span className="text-[#dfe2ee] font-bold">{TYPE_LABEL[tx.type]}</span>
          {tx.bookingId && (
            <span className="text-[10px] text-[#87948b]">
              Booking #{tx.bookingId.slice(0, 8).toUpperCase()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (tx) => <StatusBadge label={tx.status} tone={STATUS_TONE[tx.status] ?? 'neutral'} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (tx) => (
        <FinanceAmount
          value={tx.direction === 'DEBIT' ? `-${tx.amount}` : `+${tx.amount}`}
          accent={tx.direction === 'DEBIT' ? 'negative' : 'positive'}
        />
      ),
    },
  ];

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow="Rewards & Finance"
          title="Wallet"
          subtitle="A real-time view of your payments, refunds, promotions, and referral rewards."
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setRetryToken((t) => t + 1)}
              className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] text-xs font-bold shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !wallet ? (
          <LoadingState message="Loading balance…" />
        ) : (
          wallet && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Available Balance"
                  value={formatCurrency(wallet.balance, wallet.currency)}
                  accent="positive"
                  hint="From rewarded referrals"
                />
                <MetricCard
                  label="Total Debits"
                  value={formatCurrency(wallet.summary.totalDebits, wallet.currency)}
                  hint="Booking payments"
                />
                <MetricCard
                  label="Total Credits"
                  value={formatCurrency(wallet.summary.totalCredits, wallet.currency)}
                  accent="positive"
                  hint="Refunds + referral rewards"
                />
                <MetricCard
                  label="Refunds"
                  value={formatCurrency(wallet.summary.totalRefunds, wallet.currency)}
                  hint="Processed refunds"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => handleFilterChange(f.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                        filter === f.value
                          ? 'bg-[#68dba9] text-[#00311f]'
                          : 'bg-[#181c24] border border-[#262a33] text-[#bccac0] hover:bg-[#262a33]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {wallet.transactions.length === 0 ? (
                  <EmptyState
                    icon="receipt_long"
                    message="No transactions yet. Your booking payments, refunds, and referral rewards will appear here."
                  />
                ) : (
                  <>
                    <div className="hidden md:block">
                      <DataTable
                        columns={columns}
                        data={wallet.transactions}
                        keyExtractor={(tx) => tx.id}
                      />
                    </div>
                    <div className="flex flex-col gap-3 md:hidden">
                      {wallet.transactions.map((tx) => (
                        <WalletTransactionItem key={tx.id} tx={tx} />
                      ))}
                    </div>
                  </>
                )}

                <Pagination
                  page={wallet.pagination.page}
                  pageSize={wallet.pagination.pageSize}
                  total={wallet.pagination.total}
                  onPageChange={setPage}
                />
              </div>
            </>
          )
        )}
      </div>
    </CustomerLayout>
  );
}
