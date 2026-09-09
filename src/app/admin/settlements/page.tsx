'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

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
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#00311f] text-[#68dba9] border border-[#25a475]">
          Paid
        </span>
      );
    case 'FAILED':
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]">
          Failed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#262a33] text-[#87948b] border border-[#3d4a42]">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#3a2f00] text-[#f5c04a] border border-[#5c4a00]">
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
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-[#262a33] pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#dfe2ee] font-['Space_Grotesk']">
            Settlement Management
          </h1>
          <p className="text-xs text-[#87948b] mt-1">Driver payout reservations and settlements.</p>
        </div>

        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-[#dfe2ee] font-['Space_Grotesk']">
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

        {loading ? (
          <div className="flex items-center justify-center p-12 text-[#87948b]">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#68dba9] border-t-transparent mr-3" />
            Loading settlements...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-[#93000a]/20 border border-[#93000a] text-[#ffb4ab] text-sm text-center">
            {error}
          </div>
        ) : settlements.length === 0 ? (
          <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-12 text-center text-[#87948b] text-sm">
            No settlements yet.
          </div>
        ) : (
          <div className="space-y-4">
            {settlements.map((settlement) => (
              <div
                key={settlement.id}
                className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  {getStatusBadge(settlement.status)}
                  <p className="text-lg font-semibold text-[#dfe2ee]">₹{settlement.amount}</p>
                  <p className="text-xs text-[#87948b] font-mono">{settlement.driverProfileId}</p>
                  {settlement.failureReason && (
                    <p className="text-xs text-[#ffb4ab]">{settlement.failureReason}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {settlement.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => void runAction(settlement.id, 'process')}
                      className="px-4 py-2 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-semibold text-xs rounded-lg transition-colors"
                    >
                      Start Processing
                    </button>
                  )}
                  {settlement.status === 'PROCESSING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => void runAction(settlement.id, 'complete')}
                        className="px-4 py-2 bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs rounded-lg transition-colors"
                      >
                        Mark Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => void runAction(settlement.id, 'fail')}
                        className="px-4 py-2 bg-[#93000a] hover:bg-[#690005] text-[#ffdad6] font-semibold text-xs rounded-lg transition-colors"
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
    </AdminLayout>
  );
}
