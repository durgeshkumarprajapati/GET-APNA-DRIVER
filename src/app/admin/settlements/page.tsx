'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
          {status}
        </span>
      );
  }
}

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [driverProfileId, setDriverProfileId] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchSettlements = async () => {
      try {
        const res = await fetch('/api/admin/settlements');
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
  }, [refreshKey]);

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

  const runAction = async (settlementId: string, action: 'process' | 'complete' | 'fail') => {
    setActionMessage(null);
    try {
      const body = action === 'fail' ? { reason: 'Failed by admin' } : {};
      const res = await fetch(`/api/admin/settlements/${settlementId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Settlement now ${data.settlement.status}.`);
        setRefreshKey((key) => key + 1);
      } else {
        setActionMessage(data.message ?? 'Action failed.');
      }
    } catch {
      setActionMessage('Error connecting to server.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/admin/drivers" className="hover:text-emerald-400 transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Settlements</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Settlement Management</h1>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-white">Create Settlement</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={driverProfileId}
              onChange={(e) => setDriverProfileId(e.target.value)}
              placeholder="Driver profile ID"
              className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={createAmount}
              onChange={(e) => setCreateAmount(e.target.value)}
              placeholder="Amount (blank = full available)"
              className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => void createSettlement()}
              disabled={creating}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow transition-colors"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
          {actionMessage && <p className="text-sm text-slate-300">{actionMessage}</p>}
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
            No settlements yet.
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
                  <p className="text-lg font-semibold text-white">₹{settlement.amount}</p>
                  <p className="text-xs text-slate-400 font-mono">{settlement.driverProfileId}</p>
                  {settlement.failureReason && (
                    <p className="text-xs text-red-400">{settlement.failureReason}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {settlement.status === 'PENDING' && (
                    <button
                      onClick={() => void runAction(settlement.id, 'process')}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-lg transition-colors"
                    >
                      Start Processing
                    </button>
                  )}
                  {settlement.status === 'PROCESSING' && (
                    <>
                      <button
                        onClick={() => void runAction(settlement.id, 'complete')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors"
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() => void runAction(settlement.id, 'fail')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition-colors"
                      >
                        Mark Failed
                      </button>
                    </>
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
