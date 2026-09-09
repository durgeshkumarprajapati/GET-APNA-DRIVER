'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

interface DisputeLogItem {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  performedBy: string;
  notes: string | null;
  createdAt: string;
}

interface DisputeDetail {
  id: string;
  disputeNumber: string;
  bookingId: string;
  raisedByUserId: string;
  assignedOperatorId: string | null;
  category: string;
  status: string;
  reason: string;
  evidenceUrls: string[] | null;
  resolutionSummary: string | null;
  refundAmountMinorUnits: number | null;
  financialAdjustmentSummary: string | null;
  resolvedAt: string | null;
  createdAt: string;
  logs: DisputeLogItem[];
  booking?: {
    id: string;
    status: string;
    pickupAddress: string;
    customerId: string;
    driverProfileId: string | null;
    payments?: Array<{ id: string; amount: number; currency: string; status: string }>;
  } | null;
}

export default function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ disputeId: string }>;
}) {
  const { disputeId } = use(params);
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [refundRupees, setRefundRupees] = useState('');
  const [notes, setNotes] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchDispute = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`);
      if (res.ok) {
        const data = await res.json();
        setDispute(data.dispute);
      } else {
        showToast('Dispute not found or unauthorized');
      }
    } catch {
      showToast('Error loading dispute details');
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchDispute();
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [fetchDispute]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) {
      showToast('Resolution summary is required');
      return;
    }

    const refundMinor = refundRupees ? Math.round(parseFloat(refundRupees) * 100) : undefined;

    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESOLVE',
          resolutionSummary,
          refundAmountMinorUnits: refundMinor,
          notes,
        }),
      });

      if (res.ok) {
        showToast('Dispute resolved successfully with financial actions executed');
        setResolutionSummary('');
        setRefundRupees('');
        setNotes('');
        await fetchDispute();
      } else {
        const err = await res.json();
        showToast(err.error || 'Resolution failed');
      }
    } catch {
      showToast('Error resolving dispute');
    }
  };

  const handleStatusChange = async (toStatus: string) => {
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          toStatus,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        showToast(`Dispute status changed to ${toStatus}`);
        await fetchDispute();
      } else {
        const err = await res.json();
        showToast(err.error || 'Status update failed');
      }
    } catch {
      showToast('Error updating status');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-12 text-center text-slate-500">
          <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        </div>
      </AdminLayout>
    );
  }

  if (!dispute) {
    return (
      <AdminLayout>
        <div className="p-12 text-center text-slate-400">
          <p>Dispute not found.</p>
          <Link
            href="/admin/sos-and-disputes"
            className="text-emerald-400 hover:underline mt-4 inline-block"
          >
            ← Back to Console
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/sos-and-disputes"
            className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to SOS & Dispute Console
          </Link>
        </div>

        {toastMsg && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl text-sm">
            {toastMsg}
          </div>
        )}

        {/* Dispute Details Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs uppercase tracking-wider font-mono text-emerald-400 font-semibold">
                Booking Dispute Ticket
              </div>
              <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-3 mt-1">
                {dispute.disputeNumber}
                <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full font-sans font-semibold">
                  Status: {dispute.status}
                </span>
              </h1>
            </div>

            {dispute.status !== 'RESOLVED' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStatusChange('UNDER_REVIEW')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition"
                >
                  Under Review
                </button>
                <button
                  onClick={() => handleStatusChange('ESCALATED')}
                  className="px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 font-semibold rounded-xl text-sm transition"
                >
                  Escalate
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-1">
              <span className="text-slate-500 text-xs uppercase font-semibold">Category</span>
              <p className="text-slate-200 font-medium">{dispute.category.replace(/_/g, ' ')}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 text-xs uppercase font-semibold">Created At</span>
              <p className="text-slate-200 font-mono text-xs">
                {new Date(dispute.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 text-xs uppercase font-semibold">Booking ID</span>
              <p className="text-slate-200 font-mono text-xs">{dispute.bookingId}</p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">
              Dispute Reason
            </span>
            <p className="text-slate-300 text-sm">{dispute.reason}</p>
          </div>

          {/* Existing Financial Result if Resolved */}
          {dispute.resolutionSummary && (
            <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/30 space-y-2">
              <span className="text-emerald-400 text-xs uppercase font-semibold block">
                Resolution Outcome
              </span>
              <p className="text-slate-200 text-sm">{dispute.resolutionSummary}</p>
              {dispute.financialAdjustmentSummary && (
                <p className="text-emerald-300 text-xs font-mono">
                  {dispute.financialAdjustmentSummary}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Resolution & Financial Action Form */}
        {dispute.status !== 'RESOLVED' && (
          <form
            onSubmit={handleResolve}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">payments</span>
              Financial Resolution & Settlement Form
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">
                  Customer Refund Amount (₹ INR) — Optional
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 250.00 (Leave empty if zero refund)"
                  value={refundRupees}
                  onChange={(e) => setRefundRupees(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  Submitting a refund amount invokes existing finance double-entry refund services
                  safely.
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">
                  Resolution Summary (Required)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the final decision, customer support explanation, and financial adjustments..."
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-900/40"
                >
                  Confirm & Resolve Dispute
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Dispute Logs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400">format_list_bulleted</span>
            Dispute Audit & Activity History
          </h2>

          <div className="relative border-l-2 border-slate-800 pl-6 ml-3 space-y-6">
            {dispute.logs.map((entry) => (
              <div key={entry.id} className="relative">
                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-4 border-slate-900" />
                <div className="text-xs font-mono text-slate-500">
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">{entry.action}</div>
                {entry.notes && <div className="text-xs text-slate-400 mt-1">{entry.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
