'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

interface CustomerDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  dateOfBirth: string | null;
  bookingCount: number;
  paymentCount: number;
  createdAt: string;
  user: {
    id: string;
    accountStatus: string;
    email: string | null;
    phoneNumber: string | null;
  };
  recentBookings: {
    id: string;
    status: string;
    bookingType: string;
    pickupAddress: string;
    createdAt: string;
  }[];
  recentPayments: {
    id: string;
    status: string;
    amount: string;
    currency: string;
    createdAt: string;
  }[];
}

const NEXT_STATUS_OPTIONS: Record<string, string[]> = {
  PENDING: ['ACTIVE', 'DEACTIVATED'],
  ACTIVE: ['SUSPENDED', 'DEACTIVATED'],
  SUSPENDED: ['ACTIVE', 'DEACTIVATED'],
  DEACTIVATED: ['ACTIVE'],
  DELETED: [],
};

function customerDisplayName(customer: CustomerDetail): string {
  if (customer.displayName) return customer.displayName;
  const combined = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  return combined || customer.user.email || 'Unnamed Customer';
}

export default function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(params);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/admin/customers/${customerId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted) setCustomer(data.customer);
      })
      .catch(() => {
        if (isMounted) setCustomer(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [customerId, refreshKey]);

  const changeStatus = async (targetStatus: string) => {
    const reason = prompt(`Reason for changing account status to ${targetStatus}:`);
    if (!reason?.trim()) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Account status updated to ${targetStatus}.` });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: 'error', text: data.message ?? 'Failed to update account status.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to server.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 text-center text-[#87948b] text-sm">Loading customer…</div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-4">
            <p className="text-[#ffb4ab] font-semibold">Customer not found.</p>
            <Link href="/admin/customers" className="text-[#68dba9] hover:underline text-sm">
              Return to Customer Directory
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const name = customerDisplayName(customer);
  const nextStatuses = NEXT_STATUS_OPTIONS[customer.user.accountStatus] ?? [];

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-[#87948b]">
          <Link href="/admin/customers" className="hover:text-[#68dba9] transition-colors">
            Customers
          </Link>
          <span>/</span>
          <span className="text-[#dfe2ee] font-medium">{name}</span>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-[#00311f]/50 border-[#25a475] text-[#68dba9]' : 'bg-[#93000a]/20 border-[#93000a] text-[#ffb4ab]'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">{name}</h1>
            <p className="text-xs text-[#87948b] mt-1">
              {customer.user.email ?? 'No email on file'}
              {customer.user.phoneNumber && ` • ${customer.user.phoneNumber}`}
            </p>
            <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#262a33] text-[#dfe2ee]">
              {customer.user.accountStatus}
            </span>
          </div>

          {nextStatuses.length > 0 && (
            <div className="flex items-center gap-2">
              {nextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={submitting}
                  onClick={() => changeStatus(status)}
                  className="px-3 py-2 bg-[#262a33] hover:bg-[#353942] disabled:opacity-50 text-[#dfe2ee] font-semibold text-xs rounded-lg transition-colors"
                >
                  Set {status}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33]">
            <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
              Total Bookings
            </span>
            <span className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              {customer.bookingCount}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33]">
            <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
              Total Payments
            </span>
            <span className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              {customer.paymentCount}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33]">
            <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
              Customer Since
            </span>
            <span className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              {new Date(customer.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] mb-4">
              Recent Bookings
            </h2>
            {customer.recentBookings.length === 0 ? (
              <p className="text-[#87948b] text-sm">No bookings yet.</p>
            ) : (
              <div className="space-y-2">
                {customer.recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="text-[#dfe2ee] font-semibold">{booking.pickupAddress}</p>
                      <p className="text-[#87948b]">{booking.bookingType}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#dfe2ee] text-[10px] font-bold shrink-0">
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] mb-4">
              Recent Payments
            </h2>
            {customer.recentPayments.length === 0 ? (
              <p className="text-[#87948b] text-sm">No payments yet.</p>
            ) : (
              <div className="space-y-2">
                {customer.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-[#dfe2ee] font-semibold">
                      {payment.currency} {payment.amount}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#dfe2ee] text-[10px] font-bold">
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
