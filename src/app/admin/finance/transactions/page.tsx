'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/admin/drivers" className="hover:text-emerald-400 transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Financial Transactions</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Ledger</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-3" />
            Loading transactions...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm text-center">
            {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-12 text-center text-slate-400 text-sm">
            No financial transactions posted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {txn.transactionType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(txn.postedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mb-4">{txn.description}</p>
                <table className="w-full text-xs">
                  <thead className="text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left pb-2">Account</th>
                      <th className="text-right pb-2">Debit</th>
                      <th className="text-right pb-2">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txn.entries.map((entry) => (
                      <tr key={entry.id} className="border-t border-slate-700/60">
                        <td className="py-2 text-slate-200">{entry.ledgerAccount.name}</td>
                        <td className="py-2 text-right text-slate-300">
                          {Number(entry.debitAmount) > 0 ? entry.debitAmount : '—'}
                        </td>
                        <td className="py-2 text-right text-slate-300">
                          {Number(entry.creditAmount) > 0 ? entry.creditAmount : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
