'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FinanceAmount } from '@/components/ui/finance-amount';
import { SettlementStatusBadge } from '@/components/ui/transaction-status-badge';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/ui/loading-state';
import { formatDateTime } from '@/shared/formatting/date';

interface Settlement {
  id: string;
  driverProfileId: string;
  amount: string;
  amountPaid: string | null;
  status: string;
  payoutReference: string | null;
  failureReason: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = ['', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'];
const PAGE_SIZE = 25;

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [driverProfileIdFilter, setDriverProfileIdFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [driverProfileId, setDriverProfileId] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchSettlements = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (statusFilter) params.set('status', statusFilter);
        if (driverProfileIdFilter.trim())
          params.set('driverProfileId', driverProfileIdFilter.trim());
        const res = await fetch(`/api/admin/settlements?${params.toString()}`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setSettlements(data.settlements ?? []);
          setTotal(data.total ?? 0);
          setError(null);
        } else {
          setError('Failed to load settlements.');
        }
      } catch {
        if (isMounted) setError('Error connecting to server.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchSettlements();
    return () => {
      isMounted = false;
    };
  }, [refreshKey, page, statusFilter, driverProfileIdFilter]);

  const createSettlement = async () => {
    if (!driverProfileId.trim()) {
      setActionMessage('Driver profile ID is required.');
      return;
    }
    setCreating(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverProfileId: driverProfileId.trim(),
          amount: createAmount.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Settlement created: ${data.settlement.amount}`);
        setDriverProfileId('');
        setCreateAmount('');
        setPage(1);
        setRefreshKey((key) => key + 1);
      } else {
        setActionMessage(data.message ?? 'Failed to create settlement.');
      }
    } catch {
      setActionMessage('Error connecting to server.');
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (
    settlementId: string,
    action: 'process' | 'complete' | 'fail' | 'retry',
  ) => {
    setActionMessage(null);
    setBusyId(settlementId);
    try {
      const body = action === 'fail' ? { reason: 'Failed by admin' } : {};
      const res = await fetch(`/api/admin/settlements/${settlementId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(
          action === 'retry'
            ? `Retry created new settlement ${data.settlement.id}.`
            : `Settlement now ${data.settlement.status}.`,
        );
        setRefreshKey((key) => key + 1);
      } else {
        setActionMessage(data.message ?? 'Action failed.');
      }
    } catch {
      setActionMessage('Error connecting to server.');
    } finally {
      setBusyId(null);
    }
  };

  const columns: DataTableColumn<Settlement>[] = [
    {
      key: 'id',
      header: 'Settlement',
      render: (s) => (
        <Link href={`/admin/settlements/${s.id}`} className="text-[#68dba9] hover:underline">
          {s.id.slice(0, 12)}
        </Link>
      ),
    },
    { key: 'driver', header: 'Driver Profile', render: (s) => s.driverProfileId.slice(0, 12) },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (s) => <FinanceAmount value={s.amount} />,
    },
    { key: 'status', header: 'Status', render: (s) => <SettlementStatusBadge status={s.status} /> },
    {
      key: 'createdAt',
      header: 'Created',
      align: 'right',
      render: (s) => formatDateTime(s.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-2">
          {s.status === 'PENDING' && (
            <button
              type="button"
              disabled={busyId === s.id}
              onClick={() => void runAction(s.id, 'process')}
              className="px-3 py-1.5 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Start Processing
            </button>
          )}
          {s.status === 'PROCESSING' && (
            <>
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => void runAction(s.id, 'complete')}
                className="px-3 py-1.5 bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                Mark Paid
              </button>
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => void runAction(s.id, 'fail')}
                className="px-3 py-1.5 bg-[#93000a] hover:bg-[#690005] text-[#ffdad6] font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                Mark Failed
              </button>
            </>
          )}
          {s.status === 'FAILED' && (
            <button
              type="button"
              disabled={busyId === s.id}
              onClick={() => void runAction(s.id, 'retry')}
              className="px-3 py-1.5 bg-[#262a33] hover:bg-[#3d4a42] text-[#dfe2ee] font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
              title="Creates a brand-new settlement for this driver via the normal settlement path — the failed settlement itself stays terminal."
            >
              Retry
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <PageHeader
          eyebrow="Finance"
          title="Settlement Operations"
          subtitle="Driver payout reservations, settlement lifecycle, and retries."
        />

        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
            Create Settlement
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={driverProfileId}
              onChange={(e) => setDriverProfileId(e.target.value)}
              placeholder="Driver profile ID"
              className="rounded-lg bg-[#0a0e16] border border-[#262a33] px-3 py-2 text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
            />
            <input
              type="text"
              value={createAmount}
              onChange={(e) => setCreateAmount(e.target.value)}
              placeholder="Amount (blank = full available)"
              className="rounded-lg bg-[#0a0e16] border border-[#262a33] px-3 py-2 text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
            />
            <button
              type="button"
              onClick={() => void createSettlement()}
              disabled={creating}
              className="px-5 py-2 bg-[#25a475] hover:bg-[#68dba9] disabled:opacity-50 text-[#00311f] font-bold text-sm rounded-lg shadow transition-colors"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
          {actionMessage && <p className="text-sm text-[#bccac0]">{actionMessage}</p>}
        </div>

        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-4 shadow-xl flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg bg-[#0a0e16] border border-[#262a33] px-3 py-2 text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === '' ? 'All Statuses' : opt}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={driverProfileIdFilter}
            onChange={(e) => {
              setDriverProfileIdFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by driver profile ID"
            className="flex-1 min-w-[220px] rounded-lg bg-[#0a0e16] border border-[#262a33] px-3 py-2 text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
          />
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading settlements…" />
        ) : (
          <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl space-y-4">
            <DataTable
              columns={columns}
              data={settlements}
              keyExtractor={(s) => s.id}
              emptyIcon="payments"
              emptyMessage="No settlements match these filters."
            />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
