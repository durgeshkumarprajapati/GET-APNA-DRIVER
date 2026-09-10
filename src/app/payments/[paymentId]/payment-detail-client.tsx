'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

interface PaymentDetail {
  id: string;
  bookingId: string;
  status: string;
  amount: string;
  currency: string;
  provider: string;
  commissionAmount: string | null;
  driverEarningsAmount: string | null;
  capturedAt: string | null;
  createdAt: string;
}

export default function PaymentDetailPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = use(params);
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}`);
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
  }, [paymentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-3" />
        Loading payment...
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-4 p-6">
        <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm text-center max-w-sm">
          {error ?? 'Payment not found.'}
        </div>
        <Link href="/payments" className="text-emerald-400 hover:text-emerald-300 text-sm">
          ← Back to payments
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/payments" className="hover:text-emerald-400 transition-colors">
              Payments
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Detail</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {payment.currency} {payment.amount}
          </h1>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
          <Row label="Status" value={payment.status} />
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
          <Row label="Created" value={new Date(payment.createdAt).toLocaleString()} />
        </div>

        <Link
          href={`/bookings/${payment.bookingId}`}
          className="inline-block text-emerald-400 hover:text-emerald-300 text-sm"
        >
          ← View booking
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-700/60 last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
      <span className={`text-sm text-slate-100 text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}
