'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Settlement {
  id: string;
  amount: string;
  amountPaid: string | null;
  status: string;
  payoutReference: string | null;
  completedAt: string | null;
  createdAt: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Paid
        </span>
      );
    case 'FAILED':
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
          Failed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
          {status}
        </span>
      );
  }
}

export default function DriverSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettlements = async () => {
      try {
        const res = await fetch('/api/driver/settlements');
        if (res.ok) {
          const data = await res.json();
          setSettlements(data.settlements || []);
        } else {
          setError('Failed to load settlements.');
        }
      } catch {
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };

    void fetchSettlements();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/driver/wallet" className="hover:text-emerald-400 transition-colors">
              Wallet
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Settlements</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Settlement History</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-3" />
            Loading settlements...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm text-center">
            {error}
          </div>
        ) : settlements.length === 0 ? (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-12 text-center text-slate-400 text-sm">
            No settlements yet. Payouts are created by an administrator once your available balance
            reaches the settlement minimum.
          </div>
        ) : (
          <div className="space-y-4">
            {settlements.map((settlement) => (
              <div
                key={settlement.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  {getStatusBadge(settlement.status)}
                  <p className="text-lg font-semibold text-white">
                    ₹{settlement.amountPaid ?? settlement.amount}
                  </p>
                  <p className="text-xs text-slate-400">
                    Requested {new Date(settlement.createdAt).toLocaleString()}
                  </p>
                  {settlement.completedAt && (
                    <p className="text-xs text-emerald-400">
                      Paid {new Date(settlement.completedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
