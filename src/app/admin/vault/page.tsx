'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FinanceAmount } from '@/components/ui/finance-amount';
import { LoadingState } from '@/components/ui/loading-state';

interface LedgerAccountBalance {
  accountCode: string;
  accountName: string;
  balance: string;
}

export default function AdminVaultPage() {
  const [accounts, setAccounts] = useState<LedgerAccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/treasury/ledger-balances');
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setAccounts(data.accounts ?? []);
        } else {
          setError('Failed to load ledger balances.');
        }
      } catch (err) {
        if (isMounted)
          setError(err instanceof Error ? err.message : 'Failed to load ledger balances.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const columns: DataTableColumn<LedgerAccountBalance>[] = [
    { key: 'code', header: 'Account', render: (a) => a.accountCode },
    { key: 'name', header: 'Description', render: (a) => a.accountName },
    {
      key: 'balance',
      header: 'Balance (Debit − Credit)',
      align: 'right',
      render: (a) => (
        <FinanceAmount value={a.balance} accent={Number(a.balance) < 0 ? 'negative' : 'default'} />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <PageHeader
          eyebrow="Finance"
          title="Vault — Ledger Account Balances"
          subtitle="Real-time balances computed directly from posted ledger entries. The double-entry ledger remains the sole accounting authority — this is a read-only view of it, not a second source of truth."
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading ledger balances…" />
        ) : (
          <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
            <DataTable
              columns={columns}
              data={accounts}
              keyExtractor={(a) => a.accountCode}
              emptyIcon="account_balance"
              emptyMessage="No ledger accounts found."
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
