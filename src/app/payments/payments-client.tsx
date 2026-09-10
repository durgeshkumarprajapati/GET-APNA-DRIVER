'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Payment {
  id: string;
  bookingId: string;
  status: string;
  amount: string;
  currency: string;
  createdAt: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'CAPTURED':
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Captured
        </span>
      );
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          {status === 'REFUNDED' ? 'Refunded' : 'Partially Refunded'}
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

export default function PaymentsListPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch('/api/payments');
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

    void fetchPayments();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/bookings" className="hover:text-emerald-400 transition-colors">
                Customer Portal
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">Payments</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Payment History</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-3" />
            Loading your payments...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm text-center">
            {error}
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-12 text-center space-y-2">
            <p className="text-slate-300 font-medium text-lg">No payments yet.</p>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Payments are created automatically once a trip is completed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Link
                key={payment.id}
                href={`/payments/${payment.id}`}
                className="block bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl hover:border-slate-600 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">{getStatusBadge(payment.status)}</div>
                    <p className="text-lg font-semibold text-white">
                      {payment.currency} {payment.amount}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(payment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">View details →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
