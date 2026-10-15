'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';

interface LedgerEntry {
  id: string;
  debitAmount: string;
  creditAmount: string;
  ledgerAccount: { code: string; name: string };
}

interface FinancialTransaction {
  id: string;
  transactionType: string;
  description: string;
  referenceEntityType: string;
  referenceEntityId: string;
  postedAt: string;
  entries: LedgerEntry[];
}

export default function AdminFinanceTransactionsPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('/api/admin/finance/transactions');
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions || []);
        } else {
          setError('Failed to load financial transactions.');
        }
      } catch {
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };

    void fetchTransactions();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="border-b border-surface-container-high pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface font-['Space_Grotesk']">
          Ledger
        </h1>
        <p className="text-xs text-outline mt-1">
          Double-entry financial transactions posted across the platform.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-outline">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mr-3" />
          Loading transactions...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error-container text-error text-sm text-center">
          {error}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState icon="receipt_long" message="No financial transactions posted yet." />
      ) : (
        <div className="space-y-4">
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-info-container text-on-info-container border border-info-container">
                  {txn.transactionType.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-outline">
                  {new Date(txn.postedAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant mb-4">{txn.description}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-outline uppercase tracking-wider">
                    <tr>
                      <th className="text-left pb-2">Account</th>
                      <th className="text-right pb-2">Debit</th>
                      <th className="text-right pb-2">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txn.entries.map((entry) => (
                      <tr key={entry.id} className="border-t border-surface-container-high">
                        <td className="py-2 text-on-surface">{entry.ledgerAccount.name}</td>
                        <td className="py-2 text-right text-on-surface-variant">
                          {Number(entry.debitAmount) > 0 ? entry.debitAmount : '—'}
                        </td>
                        <td className="py-2 text-right text-on-surface-variant">
                          {Number(entry.creditAmount) > 0 ? entry.creditAmount : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
