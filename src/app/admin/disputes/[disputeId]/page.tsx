'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';

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
        showToast(
          err.error || 'Could not resolve this dispute. Please review the details and try again.',
        );
      }
    } catch {
      showToast('Could not resolve this dispute. Check your connection and try again.');
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
      <div className="p-12 text-center text-outline">
        <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="p-12 text-center text-on-surface-variant">
        <p>Dispute not found.</p>
        <Link
          href="/admin/sos-and-disputes"
          className="text-primary hover:underline mt-4 inline-block"
        >
          ← Back to Console
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/sos-and-disputes"
          className="text-sm font-semibold text-on-surface-variant hover:text-white flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to SOS & Dispute Console
        </Link>
      </div>

      {toastMsg && (
        <div className="bg-on-primary-container/80 border border-primary/50 text-primary px-4 py-3 rounded-xl text-sm">
          {toastMsg}
        </div>
      )}

      {/* Dispute Details Card */}
      <div className="bg-surface-container-low/80 border border-surface-container-high rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-primary font-semibold">
              Booking Dispute Ticket
            </div>
            <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-3 mt-1">
              {dispute.disputeNumber}
              <span className="bg-surface-container-high text-on-surface-variant text-xs px-3 py-1 rounded-full font-sans font-semibold">
                Status: {dispute.status}
              </span>
            </h1>
          </div>

          {dispute.status !== 'RESOLVED' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStatusChange('UNDER_REVIEW')}
                className="px-3 py-2 bg-surface-container-high hover:bg-border text-on-surface font-semibold rounded-xl text-sm transition"
              >
                Under Review
              </button>
              <button
                onClick={() => handleStatusChange('ESCALATED')}
                className="px-3 py-2 bg-suspend/30 hover:bg-suspend/50 text-on-suspend-container border border-suspend/40 font-semibold rounded-xl text-sm transition"
              >
                Escalate
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1">
            <span className="text-outline text-xs uppercase font-semibold">Category</span>
            <p className="text-on-surface font-medium">{dispute.category.replace(/_/g, ' ')}</p>
          </div>
          <div className="space-y-1">
            <span className="text-outline text-xs uppercase font-semibold">Created At</span>
            <p className="text-on-surface font-mono text-xs">
              {new Date(dispute.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-outline text-xs uppercase font-semibold">Booking ID</span>
            <p className="text-on-surface font-mono text-xs">{dispute.bookingId}</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high">
          <span className="text-outline text-xs uppercase font-semibold block mb-1">
            Dispute Reason
          </span>
          <p className="text-on-surface-variant text-sm">{dispute.reason}</p>
        </div>

        {/* Existing Financial Result if Resolved */}
        {dispute.resolutionSummary && (
          <div className="bg-on-primary-container/40 p-4 rounded-xl border border-primary/30 space-y-2">
            <span className="text-primary text-xs uppercase font-semibold block">
              Resolution Outcome
            </span>
            <p className="text-on-surface text-sm">{dispute.resolutionSummary}</p>
            {dispute.financialAdjustmentSummary && (
              <p className="text-primary text-xs font-mono">{dispute.financialAdjustmentSummary}</p>
            )}
          </div>
        )}
      </div>

      {/* Resolution & Financial Action Form */}
      {dispute.status !== 'RESOLVED' && (
        <form
          onSubmit={handleResolve}
          className="bg-surface-container-low/80 border border-surface-container-high rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            Financial Resolution & Settlement Form
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-on-surface-variant font-semibold block mb-1">
                Customer Refund Amount (₹ INR) — Optional
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 250.00 (Leave empty if zero refund)"
                value={refundRupees}
                onChange={(e) => setRefundRupees(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary font-mono"
              />
              <span className="text-xs text-outline mt-1 block">
                Submitting a refund amount invokes existing finance double-entry refund services
                safely.
              </span>
            </div>

            <div>
              <label className="text-xs text-on-surface-variant font-semibold block mb-1">
                Resolution Summary (Required)
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe the final decision, customer support explanation, and financial adjustments..."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary-container hover:bg-primary text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-900/40"
              >
                Confirm & Resolve Dispute
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Dispute Logs */}
      <div className="bg-surface-container-low/80 border border-surface-container-high rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant">
            format_list_bulleted
          </span>
          Dispute Audit & Activity History
        </h2>

        <div className="relative border-l-2 border-surface-container-high pl-6 ml-3 space-y-6">
          {dispute.logs.map((entry) => (
            <div key={entry.id} className="relative">
              <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-primary border-4 border-surface-container-low" />
              <div className="text-xs font-mono text-outline">
                {new Date(entry.createdAt).toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-on-surface mt-0.5">{entry.action}</div>
              {entry.notes && (
                <div className="text-xs text-on-surface-variant mt-1">{entry.notes}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
