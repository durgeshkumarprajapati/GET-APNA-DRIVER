'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

interface PaymentDetail {
  id: string;
  bookingId: string;
  customerId: string;
  status: string;
  amount: string;
  currency: string;
  provider: string;
  commissionAmount: string | null;
  driverEarningsAmount: string | null;
  capturedAt: string | null;
  createdAt: string;
}

export default function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = use(params);
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundMessage, setRefundMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await fetch(`/api/admin/payments/${paymentId}`);
        if (res.ok) {
          const data = await res.json();
          setPayment(data.payment);
        } else {
          setError('Payment not found.');
        }
      } catch {
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };

    void fetchPayment();
  }, [paymentId, refreshKey]);

  const submitRefund = async () => {
    setRefundSubmitting(true);
    setRefundMessage(null);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: refundAmount.trim() || undefined,
          reason: refundReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRefundMessage(
          `Refund ${data.refund.status.toLowerCase()}: ${data.refund.amount} ${payment?.currency}`,
        );
        setRefundAmount('');
        setRefundReason('');
        setRefreshKey((key) => key + 1);
      } else {
        setRefundMessage(data.message ?? 'Refund failed.');
      }
    } catch {
      setRefundMessage('Error connecting to server.');
    } finally {
      setRefundSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24 text-[#87948b]">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#68dba9] border-t-transparent mr-3" />
          Loading payment...
        </div>
      </AdminLayout>
    );
  }

  if (error || !payment) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <div className="p-4 rounded-xl bg-[#93000a]/20 border border-[#93000a] text-[#ffb4ab] text-sm text-center max-w-sm">
            {error ?? 'Payment not found.'}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const isRefundable = payment.status === 'CAPTURED' || payment.status === 'PARTIALLY_REFUNDED';

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="border-b border-[#262a33] pb-6">
          <div className="flex items-center gap-2 text-sm text-[#87948b] mb-1">
            <Link href="/admin/payments" className="hover:text-[#68dba9] transition-colors">
              Payments
            </Link>
            <span>/</span>
            <span className="text-[#dfe2ee] font-medium">Detail</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#dfe2ee] font-['Space_Grotesk']">
            {payment.currency} {payment.amount}
          </h1>
        </div>

        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
          <Row label="Status" value={payment.status} />
          <Row label="Customer" value={payment.customerId} mono />
          <Row label="Booking" value={payment.bookingId} mono />
          <Row label="Provider" value={payment.provider} />
          {payment.commissionAmount && (
            <Row
              label="Platform commission"
              value={`${payment.currency} ${payment.commissionAmount}`}
            />
          )}
          {payment.driverEarningsAmount && (
            <Row
              label="Driver earnings"
              value={`${payment.currency} ${payment.driverEarningsAmount}`}
            />
          )}
          <Row
            label="Captured at"
            value={
              payment.capturedAt
                ? new Date(payment.capturedAt).toLocaleString()
                : 'Not yet captured'
            }
          />
        </div>

        {isRefundable && (
          <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-[#dfe2ee] font-['Space_Grotesk']">
              Issue Refund
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-[#87948b] font-semibold">
                  Amount (leave blank for full remaining refund)
                </label>
                <input
                  type="text"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="e.g. 50.00"
                  className="mt-1 w-full rounded-lg bg-[#0a0e16] border border-[#262a33] px-3 py-2 text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[#87948b] font-semibold">
                  Reason
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer complaint"
                  className="mt-1 w-full rounded-lg bg-[#0a0e16] border border-[#262a33] px-3 py-2 text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                />
              </div>
              <button
                type="button"
                onClick={() => void submitRefund()}
                disabled={refundSubmitting}
                className="w-full px-5 py-2.5 bg-[#93000a] hover:bg-[#690005] disabled:opacity-50 text-[#ffdad6] font-semibold text-sm rounded-xl shadow transition-colors"
              >
                {refundSubmitting ? 'Processing...' : 'Issue Refund'}
              </button>
              {refundMessage && (
                <p className="text-sm text-[#bccac0] text-center">{refundMessage}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[#262a33] last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-[#87948b] font-semibold">{label}</span>
      <span className={`text-sm text-[#dfe2ee] text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}
