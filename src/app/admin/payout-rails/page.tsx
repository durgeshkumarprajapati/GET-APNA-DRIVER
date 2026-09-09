'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
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
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <PageHeader
          eyebrow="Finance"
          title="Payout Rails"
          subtitle="Disbursement provider status and recent payout activity."
        />

        <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-2">
          <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
            Active Provider
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#262a33] text-[#f5c542] text-[10px] font-bold uppercase tracking-wider">
              Development / Test Provider
            </span>
          </div>
          <p className="text-xs text-[#87948b]">
            No real IMPS/UPI/bank-rail integration exists yet — settlements are processed through a
            clearly-labeled development provider that never moves real money. It issues
            deterministic references (prefixed <code className="text-[#dfe2ee]">DEV-PAYOUT-</code>)
            through the same provider interface a real payout rail would implement, so switching to
            a live provider later requires no change to settlement-service.ts.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
            Recent Payout Activity
          </h2>
          {loading ? (
            <LoadingState message="Loading payout activity…" />
          ) : (
            <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
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
    </AdminLayout>
  );
}
