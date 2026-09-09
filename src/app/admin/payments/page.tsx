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
  createdAt: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    void fetchPayments();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/admin/drivers" className="hover:text-emerald-400 transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Payments</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Payment Management</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-3" />
            Loading payments...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm text-center">
            {error}
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-12 text-center text-slate-400 text-sm">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Booking</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-left px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="bg-slate-800/60 hover:bg-slate-800 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {payment.currency} {payment.amount}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{payment.status}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {payment.bookingId}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/payments/${payment.id}`}
                        className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
