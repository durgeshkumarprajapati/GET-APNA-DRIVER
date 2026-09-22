'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  status: string;
  amount: string;
  currency: string;
  provider?: string | null;
  paymentMethod?: string | null;
  discountAmount?: string | null;
  cashCustomerConfirmedAt?: string | null;
  cashDriverConfirmedAt?: string | null;
  createdAt: string;
}

interface WebhookEvent {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  signatureVerified: boolean;
  processingStatus: string;
  errorDetails?: string | null;
  createdAt: string;
}

interface ReconciliationFeedback {
  inspected: number;
  captured: number;
  failed: number;
  unchanged: number;
}

function statusBadgeClass(status: string): string {
  if (status === 'CAPTURED') return 'bg-[#00311f] text-[#68dba9] border border-[#25a475]';
  if (status === 'FAILED' || status === 'CANCELLED') {
    return 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]';
  }
  return 'bg-[#262a33] text-[#dfe2ee] border border-[#3d4a42]';
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'payments' | 'webhooks'>('payments');
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconcileFeedback, setReconcileFeedback] = useState<ReconciliationFeedback | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      } else {
        setError('Failed to load payments.');
      }
    } catch {
      setError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/admin/payments/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch {
      // Ignore background webhook load error
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPayments();
    void fetchWebhooks();
  }, []);

  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileFeedback(null);
    try {
      const res = await fetch('/api/admin/payments/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanMinutes: 15 }),
      });
      if (res.ok) {
        const data = await res.json();
        setReconcileFeedback(data.reconciliation);
        await fetchPayments();
      } else {
        setError('Failed to execute payment reconciliation.');
      }
    } catch {
      setError('Error communicating with reconciliation endpoint.');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="border-b border-[#262a33] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#dfe2ee] font-['Space_Grotesk']">
            Payment & Settlement Management
          </h1>
          <p className="text-xs text-[#87948b] mt-1">
            Production payment providers, webhook event logs, and automated reconciliation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#68dba9] text-[#003822] hover:bg-[#57c998] disabled:opacity-50 transition-colors shadow-sm flex items-center"
          >
            {reconciling ? (
              <>
                <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-[#003822] border-t-transparent mr-2" />
                Reconciling...
              </>
            ) : (
              'Run Reconciliation'
            )}
          </button>
        </div>
      </div>

      {reconcileFeedback && (
        <div className="p-4 rounded-xl bg-[#00311f] border border-[#25a475] text-[#68dba9] text-xs">
          <strong>Reconciliation Complete:</strong> Inspected {reconcileFeedback.inspected} payments
          | Captured: {reconcileFeedback.captured} | Failed: {reconcileFeedback.failed} | Unchanged:{' '}
          {reconcileFeedback.unchanged}
        </div>
      )}

      <div className="flex space-x-4 border-b border-[#262a33] text-sm font-semibold">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-1 transition-colors ${
            activeTab === 'payments'
              ? 'text-[#68dba9] border-b-2 border-[#68dba9]'
              : 'text-[#87948b] hover:text-[#dfe2ee]'
          }`}
        >
          Payments ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 px-1 transition-colors ${
            activeTab === 'webhooks'
              ? 'text-[#68dba9] border-b-2 border-[#68dba9]'
              : 'text-[#87948b] hover:text-[#dfe2ee]'
          }`}
        >
          Webhook Delivery Logs ({webhooks.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-[#87948b]">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#68dba9] border-t-transparent mr-3" />
          Loading payments...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-[#93000a]/20 border border-[#93000a] text-[#ffb4ab] text-sm text-center">
          {error}
        </div>
      ) : activeTab === 'payments' ? (
        payments.length === 0 ? (
          <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-12 text-center text-[#87948b] text-sm">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#262a33]">
            <table className="w-full text-sm">
              <thead className="bg-[#181c24] text-[#87948b] text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Provider / Method</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Booking</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-left px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33]">
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="bg-[#0a0e16] hover:bg-[#181c24] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#dfe2ee]">
                      <div>
                        {payment.currency} {payment.amount}
                      </div>
                      {payment.discountAmount && parseFloat(payment.discountAmount) > 0 && (
                        <div className="text-[10px] text-emerald-400 font-normal">
                          Discount: -{payment.currency} {payment.discountAmount}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-indigo-300 uppercase">
                      <div>{payment.paymentMethod || 'ONLINE'}</div>
                      <div className="text-[10px] text-[#87948b] font-normal lowercase">
                        {payment.provider || 'razorpay'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(payment.status)}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#87948b]">
                      {payment.bookingId.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-[#87948b]">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/payments/${payment.id}`}
                        className="text-[#68dba9] hover:underline text-xs font-semibold"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : webhooks.length === 0 ? (
        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-12 text-center text-[#87948b] text-sm">
          No webhook delivery events recorded.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#262a33]">
          <table className="w-full text-sm">
            <thead className="bg-[#181c24] text-[#87948b] text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Event Type</th>
                <th className="text-left px-4 py-3">Provider Event ID</th>
                <th className="text-left px-4 py-3">Signature</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Received At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262a33]">
              {webhooks.map((wh) => (
                <tr key={wh.id} className="bg-[#0a0e16] hover:bg-[#181c24] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#dfe2ee]">{wh.eventType}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#87948b]">
                    {wh.providerEventId.substring(0, 16)}...
                  </td>
                  <td className="px-4 py-3">
                    {wh.signatureVerified ? (
                      <span className="text-[10px] font-semibold text-emerald-400">✓ Verified</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-red-400">
                        ✕ Invalid / Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#262a33] text-[#dfe2ee]">
                      {wh.processingStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#87948b]">
                    {new Date(wh.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
