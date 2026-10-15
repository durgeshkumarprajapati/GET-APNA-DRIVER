'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';

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
  if (status === 'CAPTURED')
    return 'bg-on-primary-container text-primary border border-primary-container';
  if (status === 'FAILED' || status === 'CANCELLED') {
    return 'bg-error-container/20 text-error border border-error-container';
  }
  return 'bg-surface-container-high text-on-surface border border-border';
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
      <div className="border-b border-surface-container-high pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface font-['Space_Grotesk']">
            Payment & Settlement Management
          </h1>
          <p className="text-xs text-outline mt-1">
            Production payment providers, webhook event logs, and automated reconciliation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-on-primary-container hover:bg-primary disabled:opacity-50 transition-colors shadow-sm flex items-center"
          >
            {reconciling ? (
              <>
                <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-on-primary-container border-t-transparent mr-2" />
                Reconciling...
              </>
            ) : (
              'Run Reconciliation'
            )}
          </button>
        </div>
      </div>

      {reconcileFeedback && (
        <div className="p-4 rounded-xl bg-on-primary-container border border-primary-container text-primary text-xs">
          <strong>Reconciliation Complete:</strong> Inspected {reconcileFeedback.inspected} payments
          | Captured: {reconcileFeedback.captured} | Failed: {reconcileFeedback.failed} | Unchanged:{' '}
          {reconcileFeedback.unchanged}
        </div>
      )}

      <div className="flex space-x-4 border-b border-surface-container-high text-sm font-semibold">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-1 transition-colors ${
            activeTab === 'payments'
              ? 'text-primary border-b-2 border-primary'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          Payments ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 px-1 transition-colors ${
            activeTab === 'webhooks'
              ? 'text-primary border-b-2 border-primary'
              : 'text-outline hover:text-on-surface'
          }`}
        >
          Webhook Delivery Logs ({webhooks.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-outline">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mr-3" />
          Loading payments...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error-container text-error text-sm text-center">
          {error}
        </div>
      ) : activeTab === 'payments' ? (
        payments.length === 0 ? (
          <EmptyState icon="payments" message="No payments recorded yet." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-surface-container-high">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low text-outline text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Provider / Method</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Booking</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-left px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-on-surface">
                      <div>
                        {payment.currency} {payment.amount}
                      </div>
                      {payment.discountAmount && parseFloat(payment.discountAmount) > 0 && (
                        <div className="text-[10px] text-primary font-normal">
                          Discount: -{payment.currency} {payment.discountAmount}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-on-info-container uppercase">
                      <div>{payment.paymentMethod || 'ONLINE'}</div>
                      <div className="text-[10px] text-outline font-normal lowercase">
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
                    <td className="px-4 py-3 font-mono text-xs text-outline">
                      {payment.bookingId.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-outline">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/payments/${payment.id}`}
                        className="text-primary hover:underline text-xs font-semibold"
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
        <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-12 text-center text-outline text-sm">
          No webhook delivery events recorded.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-container-high">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-outline text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Event Type</th>
                <th className="text-left px-4 py-3">Provider Event ID</th>
                <th className="text-left px-4 py-3">Signature</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Received At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {webhooks.map((wh) => (
                <tr
                  key={wh.id}
                  className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-on-surface">{wh.eventType}</td>
                  <td className="px-4 py-3 font-mono text-xs text-outline">
                    {wh.providerEventId.substring(0, 16)}...
                  </td>
                  <td className="px-4 py-3">
                    {wh.signatureVerified ? (
                      <span className="text-[10px] font-semibold text-primary">✓ Verified</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-on-error-container">
                        ✕ Invalid / Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-on-surface">
                      {wh.processingStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-outline">
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
