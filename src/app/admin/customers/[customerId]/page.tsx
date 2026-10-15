'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';

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
    return <div className="py-24 text-center text-outline text-sm">Loading customer…</div>;
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <p className="text-error font-semibold">Customer not found.</p>
          <Link href="/admin/customers" className="text-primary hover:underline text-sm">
            Return to Customer Directory
          </Link>
        </div>
      </div>
    );
  }

  const name = customerDisplayName(customer);
  const nextStatuses = NEXT_STATUS_OPTIONS[customer.user.accountStatus] ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-outline">
        <Link href="/admin/customers" className="hover:text-primary transition-colors">
          Customers
        </Link>
        <span>/</span>
        <span className="text-on-surface font-medium">{name}</span>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-on-primary-container/50 border-primary-container text-primary' : 'bg-error-container/20 border-error-container text-error'}`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">{name}</h1>
          <p className="text-xs text-outline mt-1">
            {customer.user.email ?? 'No email on file'}
            {customer.user.phoneNumber && ` • ${customer.user.phoneNumber}`}
          </p>
          <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface">
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
                className="px-3 py-2 bg-surface-container-high hover:bg-surface-bright disabled:opacity-50 text-on-surface font-semibold text-xs rounded-lg transition-colors"
              >
                Set {status}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
          <span className="text-[10px] font-bold text-outline uppercase font-['Space_Grotesk'] block">
            Total Bookings
          </span>
          <span className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">
            {customer.bookingCount}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
          <span className="text-[10px] font-bold text-outline uppercase font-['Space_Grotesk'] block">
            Total Payments
          </span>
          <span className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">
            {customer.paymentCount}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
          <span className="text-[10px] font-bold text-outline uppercase font-['Space_Grotesk'] block">
            Customer Since
          </span>
          <span className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">
            {new Date(customer.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-on-surface font-['Space_Grotesk'] mb-4">
            Recent Bookings
          </h2>
          {customer.recentBookings.length === 0 ? (
            <EmptyState icon="local_taxi" message="No bookings yet." />
          ) : (
            <div className="space-y-2">
              {customer.recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="text-on-surface font-semibold">{booking.pickupAddress}</p>
                    <p className="text-outline">{booking.bookingType}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[10px] font-bold shrink-0">
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-on-surface font-['Space_Grotesk'] mb-4">
            Recent Payments
          </h2>
          {customer.recentPayments.length === 0 ? (
            <EmptyState icon="payments" message="No payments yet." />
          ) : (
            <div className="space-y-2">
              {customer.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-on-surface font-semibold">
                    {payment.currency} {payment.amount}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[10px] font-bold">
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
