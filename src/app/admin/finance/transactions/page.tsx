'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

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
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-[#262a33] pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#dfe2ee] font-['Space_Grotesk']">
            Ledger
          </h1>
          <p className="text-xs text-[#87948b] mt-1">
            Double-entry financial transactions posted across the platform.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-[#87948b]">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#68dba9] border-t-transparent mr-3" />
            Loading transactions...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-[#93000a]/20 border border-[#93000a] text-[#ffb4ab] text-sm text-center">
            {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-12 text-center text-[#87948b] text-sm">
            No financial transactions posted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#003544] text-[#7fd8ff] border border-[#1a5a70]">
                    {txn.transactionType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-[#87948b]">
                    {new Date(txn.postedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-[#bccac0] mb-4">{txn.description}</p>
                <table className="w-full text-xs">
                  <thead className="text-[#87948b] uppercase tracking-wider">
                    <tr>
                      <th className="text-left pb-2">Account</th>
                      <th className="text-right pb-2">Debit</th>
                      <th className="text-right pb-2">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txn.entries.map((entry) => (
                      <tr key={entry.id} className="border-t border-[#262a33]">
                        <td className="py-2 text-[#dfe2ee]">{entry.ledgerAccount.name}</td>
                        <td className="py-2 text-right text-[#bccac0]">
                          {Number(entry.debitAmount) > 0 ? entry.debitAmount : '—'}
                        </td>
                        <td className="py-2 text-right text-[#bccac0]">
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
    </AdminLayout>
  );
}
