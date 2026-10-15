'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';

interface DispatchAssignmentAttempt {
  id: string;
  attemptNumber: number;
  status: string;
  offeredAt: string;
  respondedAt: string | null;
  expiresAt: string;
  rejectionReason: string | null;
  driver: { id: string; name: string };
}

interface DispatchBookingDetail {
  id: string;
  status: string;
  bookingType: string;
  pickupAddress: string;
  pickupLabel: string | null;
  requestedStartTime: string | null;
  searchStartedAt: string | null;
  assignedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  customer: { id: string; email: string | null; phoneNumber: string | null };
  assignedDriver: { id: string; name: string; availabilityStatus: string } | null;
  assignmentAttempts: DispatchAssignmentAttempt[];
}

interface DriverSearchResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  availabilityStatus: string;
  approvalStatus: string;
}

function attemptStatusBadgeClass(status: string): string {
  if (status === 'ACCEPTED')
    return 'bg-on-primary-container text-primary border border-primary-container';
  if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED') {
    return 'bg-error-container/20 text-error border border-error-container';
  }
  return 'bg-warning-container text-on-warning-container border border-warning-container';
}

export default function AdminDispatchConsolePage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<DispatchBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [driverSearch, setDriverSearch] = useState('');
  const [driverResults, setDriverResults] = useState<DriverSearchResult[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [offerBypassEligibility, setOfferBypassEligibility] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/admin/bookings/${bookingId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted) setBooking(data.booking);
      })
      .catch(() => {
        if (isMounted) setBooking(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [bookingId, refreshKey]);

  useEffect(() => {
    if (!driverSearch.trim()) {
      return;
    }
    let isMounted = true;
    const params = new URLSearchParams({
      search: driverSearch.trim(),
      availabilityStatus: 'AVAILABLE',
      approvalStatus: 'APPROVED',
      pageSize: '10',
    });
    fetch(`/api/admin/drivers?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted) setDriverResults(data.drivers ?? []);
      })
      .catch(() => {
        if (isMounted) setDriverResults([]);
      });
    return () => {
      isMounted = false;
    };
  }, [driverSearch]);

  const runAction = async (
    endpoint: string,
    body: Record<string, unknown>,
    successText: string,
  ) => {
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'A reason is required for this action.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, ...body }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: successText });
        setReason('');
        setSelectedDriverId(null);
        setOfferBypassEligibility(false);
        setRefreshKey((k) => k + 1);
      } else if (data.error === 'DRIVER_NOT_ASSIGNABLE' && data.message?.includes('not eligible')) {
        setMessage({ type: 'error', text: `${data.message} You may force-assign anyway below.` });
        setOfferBypassEligibility(true);
      } else {
        setMessage({ type: 'error', text: data.message ?? 'Action failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to server.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-outline text-sm">Loading booking…</div>;
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <p className="text-error font-semibold">Booking not found.</p>
          <Link href="/admin/live-bookings" className="text-primary hover:underline text-sm">
            Return to Live Bookings
          </Link>
        </div>
      </div>
    );
  }

  const canReassign = booking.status === 'DRIVER_ASSIGNED';
  const canRestartSearch = booking.status === 'EXPIRED';
  const canForceAssign =
    booking.status === 'SEARCHING_DRIVER' || booking.status === 'DRIVER_ASSIGNED';
  const canCancel = [
    'DRAFT',
    'SEARCHING_DRIVER',
    'DRIVER_ASSIGNED',
    'DRIVER_EN_ROUTE',
    'DRIVER_ARRIVED',
  ].includes(booking.status);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-outline">
        <Link href="/admin/live-bookings" className="hover:text-primary transition-colors">
          Live Bookings
        </Link>
        <span>/</span>
        <span className="text-on-surface font-medium font-mono">{booking.id}</span>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-on-primary-container/50 border-primary-container text-primary' : 'bg-error-container/20 border-error-container text-error'}`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-on-surface font-['Space_Grotesk']">
            {booking.pickupLabel ?? booking.pickupAddress}
          </h1>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface">
            {booking.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-outline uppercase font-bold block mb-1">Customer</span>
            <span className="text-on-surface">{booking.customer.email ?? '—'}</span>
            {booking.customer.phoneNumber && (
              <span className="block text-outline">{booking.customer.phoneNumber}</span>
            )}
          </div>
          <div>
            <span className="text-outline uppercase font-bold block mb-1">Assigned Driver</span>
            <span className="text-on-surface">
              {booking.assignedDriver
                ? `${booking.assignedDriver.name} (${booking.assignedDriver.availabilityStatus})`
                : '—'}
            </span>
          </div>
          <div>
            <span className="text-outline uppercase font-bold block mb-1">Type</span>
            <span className="text-on-surface">{booking.bookingType}</span>
          </div>
        </div>
      </div>

      {/* Assignment Attempts */}
      <section className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-on-surface font-['Space_Grotesk'] mb-4">
          Assignment Attempts
        </h2>
        {booking.assignmentAttempts.length === 0 ? (
          <EmptyState icon="history" message="No assignment attempts yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-outline uppercase text-[10px] border-b border-surface-container-high">
                <tr>
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Driver</th>
                  <th className="py-2 pr-4">Offered</th>
                  <th className="py-2 pr-4">Responded</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Rejection Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {booking.assignmentAttempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="py-2 pr-4 text-outline">{attempt.attemptNumber}</td>
                    <td className="py-2 pr-4 text-on-surface">{attempt.driver.name}</td>
                    <td className="py-2 pr-4 text-outline">
                      {new Date(attempt.offeredAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-outline">
                      {attempt.respondedAt ? new Date(attempt.respondedAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${attemptStatusBadgeClass(attempt.status)}`}
                      >
                        {attempt.status}
                      </span>
                    </td>
                    <td className="py-2 text-outline">{attempt.rejectionReason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Operator Actions */}
      <section className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-on-surface font-['Space_Grotesk']">
          Operator Actions
        </h2>

        <div>
          <label className="text-xs uppercase tracking-wider text-outline font-semibold">
            Reason (required for every action below)
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this operator action is being taken..."
            className="mt-1 w-full rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {canReassign && (
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                runAction(
                  `/api/admin/bookings/${bookingId}/reassign`,
                  {},
                  'Driver released; matching restarted.',
                )
              }
              className="px-4 py-2 bg-surface-container-high hover:bg-surface-bright disabled:opacity-50 text-on-surface font-semibold text-xs rounded-lg transition-colors"
            >
              Reassign Driver (Release &amp; Re-Search)
            </button>
          )}
          {canRestartSearch && (
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                runAction(
                  `/api/admin/bookings/${bookingId}/restart-search`,
                  {},
                  'Search restarted.',
                )
              }
              className="px-4 py-2 bg-surface-container-high hover:bg-surface-bright disabled:opacity-50 text-on-surface font-semibold text-xs rounded-lg transition-colors"
            >
              Restart Search
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                runAction(
                  `/api/admin/bookings/${bookingId}/cancel`,
                  {},
                  'Booking cancelled by operator; driver released.',
                )
              }
              className="px-4 py-2 bg-error-container hover:bg-on-error disabled:opacity-50 text-on-error-container font-semibold text-xs rounded-lg transition-colors"
            >
              Cancel Booking (Operator)
            </button>
          )}
          {!canReassign && !canRestartSearch && !canCancel && (
            <p className="text-xs text-outline">
              No operator actions are valid from the current booking status.
            </p>
          )}
        </div>

        {canForceAssign && (
          <div className="border-t border-surface-container-high pt-4 space-y-3">
            <h3 className="text-sm font-bold text-on-surface">Force Assign a Specific Driver</h3>
            <input
              type="text"
              value={driverSearch}
              onChange={(e) => {
                setDriverSearch(e.target.value);
                if (!e.target.value.trim()) setDriverResults([]);
              }}
              placeholder="Search available, approved drivers by name..."
              className="w-full rounded-lg bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            {driverResults.length > 0 && (
              <div className="space-y-1">
                {driverResults.map((driver) => {
                  const name =
                    driver.displayName ||
                    [driver.firstName, driver.lastName].filter(Boolean).join(' ') ||
                    driver.id;
                  return (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => setSelectedDriverId(driver.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                        selectedDriverId === driver.id
                          ? 'bg-primary-container text-on-primary-container font-bold'
                          : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}

            {offerBypassEligibility && (
              <label className="flex items-center gap-2 text-xs text-error">
                <input
                  type="checkbox"
                  checked={offerBypassEligibility}
                  onChange={(e) => setOfferBypassEligibility(e.target.checked)}
                />
                Force-assign despite failed eligibility checks (high-severity, audited)
              </label>
            )}

            <button
              type="button"
              disabled={submitting || !selectedDriverId}
              onClick={() =>
                runAction(
                  `/api/admin/bookings/${bookingId}/force-assign`,
                  {
                    driverProfileId: selectedDriverId,
                    bypassEligibility: offerBypassEligibility,
                  },
                  'Driver force-assigned.',
                )
              }
              className="px-4 py-2 bg-error-container hover:bg-on-error disabled:opacity-40 text-on-error-container font-bold text-xs rounded-lg transition-colors"
            >
              Force Assign Selected Driver
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
