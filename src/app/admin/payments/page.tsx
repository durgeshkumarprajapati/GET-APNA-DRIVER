'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  status: string;
  amount: string;
  currency: string;
  createdAt: string;
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
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-[#262a33] pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#dfe2ee] font-['Space_Grotesk']">
            Payment Management
          </h1>
          <p className="text-xs text-[#87948b] mt-1">All customer payments across the platform.</p>
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
        ) : payments.length === 0 ? (
          <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-12 text-center text-[#87948b] text-sm">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#262a33]">
            <table className="w-full text-sm">
              <thead className="bg-[#181c24] text-[#87948b] text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Amount</th>
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
                      {payment.currency} {payment.amount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(payment.status)}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#87948b]">
                      {payment.bookingId}
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
        )}
      </div>
    </AdminLayout>
  );
}
