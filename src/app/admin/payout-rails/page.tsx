'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FinanceAmount } from '@/components/ui/finance-amount';
import { SettlementStatusBadge } from '@/components/ui/transaction-status-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { formatDateTime } from '@/shared/formatting/date';

interface Settlement {
  id: string;
  driverProfileId: string;
  amount: string;
  status: string;
  payoutProvider: string | null;
  payoutReference: string | null;
  initiatedAt: string | null;
  completedAt: string | null;
}

export default function AdminPayoutRailsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/settlements');
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setSettlements(
            (data.settlements ?? []).filter((s: Settlement) => s.payoutProvider !== null),
          );
        } else {
          setError('Failed to load payout activity.');
        }
      } catch (err) {
        if (isMounted)
          setError(err instanceof Error ? err.message : 'Failed to load payout activity.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const columns: DataTableColumn<Settlement>[] = [
    { key: 'id', header: 'Settlement', render: (s) => s.id.slice(0, 12) },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (s) => <FinanceAmount value={s.amount} />,
    },
    { key: 'status', header: 'Status', render: (s) => <SettlementStatusBadge status={s.status} /> },
    { key: 'provider', header: 'Provider', render: (s) => s.payoutProvider ?? '—' },
    { key: 'reference', header: 'Reference', render: (s) => s.payoutReference ?? '—' },
    {
      key: 'initiatedAt',
      header: 'Initiated',
      align: 'right',
      render: (s) => (s.initiatedAt ? formatDateTime(s.initiatedAt) : '—'),
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        eyebrow="Finance"
        title="Payout Rails"
        subtitle="Disbursement provider status and recent payout activity."
      />

      <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2">
        <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
          Active Provider
        </h2>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-warning-container text-[10px] font-bold uppercase tracking-wider">
            Development / Test Provider
          </span>
        </div>
        <p className="text-xs text-outline">
          No real IMPS/UPI/bank-rail integration exists yet — settlements are processed through a
          clearly-labeled development provider that never moves real money. It issues deterministic
          references (prefixed <code className="text-on-surface">DEV-PAYOUT-</code>) through the
          same provider interface a real payout rail would implement, so switching to a live
          provider later requires no change to settlement-service.ts.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-error-container bg-error-container/20 text-error text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-on-surface font-['Space_Grotesk']">
          Recent Payout Activity
        </h2>
        {loading ? (
          <LoadingState message="Loading payout activity…" />
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-5 shadow-xl">
            <DataTable
              columns={columns}
              data={settlements}
              keyExtractor={(s) => s.id}
              emptyIcon="currency_rupee"
              emptyMessage="No settlements have been sent to a payout provider yet."
            />
          </div>
        )}
      </div>
    </div>
  );
}
