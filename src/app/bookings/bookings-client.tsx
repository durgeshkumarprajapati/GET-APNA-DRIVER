'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { RatingStars } from '@/components/ui/rating-stars';
import { useTranslation } from '@/i18n/context';
import { CustomerBookingCardItem } from '@/modules/booking/application/customer-booking-query-service';

export default function BookingsListPage() {
  const { formatCurrency, formatDate, statusLabel } = useTranslation();
  const [bookings, setBookings] = useState<CustomerBookingCardItem[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    upcoming: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });
  const [statusTab, setStatusTab] = useState<
    'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  >('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadBookings() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          statusTab,
        });
        if (search.trim()) params.set('search', search.trim());
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (paymentStatus) params.set('paymentStatus', paymentStatus);

        const res = await fetch(`/api/customer/bookings?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load bookings');
        const data = await res.json();
        if (!isMounted) return;

        if (data.success) {
          setBookings(data.bookings || []);
          setCounts(
            data.counts || {
              all: 0,
              upcoming: 0,
              active: 0,
              completed: 0,
              cancelled: 0,
            },
          );
          setTotalPages(data.totalPages || 1);
          setError(null);
        } else {
          setError(data.message || 'Error fetching bookings');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Error loading booking history');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, statusTab, search, startDate, endDate, paymentStatus]);

  const getStatusBadge = (status: string) => {
    let badgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
    if (status === 'SEARCHING_DRIVER')
      badgeClass = 'bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse';
    if (status === 'DRIVER_ASSIGNED')
      badgeClass = 'bg-[#68dba9]/10 text-[#68dba9] border-[#68dba9]/30';
    if (status === 'DRIVER_EN_ROUTE')
      badgeClass = 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 animate-pulse';
    if (status === 'DRIVER_ARRIVED')
      badgeClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 animate-pulse';
    if (status === 'TRIP_IN_PROGRESS')
      badgeClass = 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40 animate-pulse';
    if (status === 'TRIP_COMPLETED')
      badgeClass = 'bg-emerald-950/90 text-emerald-400 border-emerald-500/40';
    if (status === 'CANCELLED') badgeClass = 'bg-red-950/80 text-red-300 border-red-500/40';
    if (status === 'EXPIRED') badgeClass = 'bg-slate-800 text-slate-400 border-slate-700';

    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold border font-mono ${badgeClass}`}
      >
        {statusLabel(status)}
      </span>
    );
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0e16] p-6 rounded-2xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-base">calendar_month</span>
              <span>Customer Booking Management</span>
            </div>
            <h1 className="text-2xl font-bold text-white font-['Space_Grotesk'] mt-1">
              Service History & Bookings
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your active, upcoming, completed, and cancelled chauffeur driver services.
            </p>
          </div>
          <Link
            href="/bookings/new"
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-[#68dba9] hover:bg-[#52c693] active:bg-[#003825] text-[#003825] font-bold text-xs rounded-xl shadow transition-colors text-center"
          >
            + Book Chauffeur Now
          </Link>
        </div>

        {/* STATUS TABS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#262a33] pb-3">
          {[
            { key: 'ALL', label: 'All Services', count: counts.all },
            { key: 'UPCOMING', label: 'Upcoming', count: counts.upcoming },
            { key: 'ACTIVE', label: 'Active Rides', count: counts.active },
            { key: 'COMPLETED', label: 'Completed', count: counts.completed },
            { key: 'CANCELLED', label: 'Cancelled', count: counts.cancelled },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusTab(tab.key as typeof statusTab);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                statusTab === tab.key
                  ? 'bg-[#68dba9] text-[#003825] font-bold shadow-lg'
                  : 'bg-[#0a0e16] hover:bg-[#181c24] text-slate-300 border border-[#262a33]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  statusTab === tab.key
                    ? 'bg-[#003825] text-[#68dba9]'
                    : 'bg-[#181c24] text-slate-400 border border-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* FILTERS & SEARCH */}
        <div className="bg-[#0a0e16] p-4 rounded-2xl border border-[#262a33] flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search Booking ID, Driver, Recipient..."
              className="w-full pl-9 pr-3 py-2 bg-[#181c24] border border-[#262a33] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#68dba9]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="bg-[#181c24] border border-[#262a33] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#68dba9]"
            >
              <option value="">All Payment Statuses</option>
              <option value="CAPTURED">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="bg-[#181c24] border border-[#262a33] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#68dba9]"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="bg-[#181c24] border border-[#262a33] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#68dba9]"
            />
          </div>
        </div>

        {/* LOADING & ERROR */}
        {loading && (
          <div className="flex items-center justify-center p-12 bg-[#0a0e16] rounded-2xl border border-[#262a33]">
            <div className="flex flex-col items-center gap-3">
              <span className="w-8 h-8 rounded-full border-2 border-[#68dba9] border-t-transparent animate-spin" />
              <span className="text-xs font-mono text-slate-400">Loading service history...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-xs text-red-300 font-mono">
            {error}
          </div>
        )}

        {/* BOOKINGS LIST */}
        {!loading && !error && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="bg-[#0a0e16] border border-[#262a33] rounded-2xl p-12 text-center space-y-4">
                <span className="material-symbols-outlined text-4xl text-slate-600 block">
                  calendar_today
                </span>
                <p className="text-white font-bold text-lg">No services found</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {statusTab === 'UPCOMING'
                    ? 'No upcoming scheduled chauffeur rides.'
                    : statusTab === 'ACTIVE'
                      ? 'No active ride in progress.'
                      : statusTab === 'COMPLETED'
                        ? 'No completed driver trips yet.'
                        : statusTab === 'CANCELLED'
                          ? 'No cancelled services found.'
                          : 'Your booking history will appear here once you book a driver.'}
                </p>
                <Link
                  href="/bookings/new"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-[#68dba9] text-[#003825] font-bold text-xs rounded-xl transition-colors"
                >
                  Book Chauffeur Now
                </Link>
              </div>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-[#0a0e16] border border-[#262a33] hover:border-slate-700 rounded-2xl p-6 shadow-xl transition-all space-y-4 text-slate-200"
                >
                  {/* TOP CARD BAR */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#262a33] pb-3">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(booking.status)}
                      <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                        {booking.bookingType.replace(/_/g, ' ')}
                      </span>
                      {booking.vehicleCategory && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                          {booking.vehicleCategory.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                      <span>
                        Booking ID:{' '}
                        <strong className="text-white">{booking.id.substring(0, 8)}...</strong>
                      </span>
                      <span>•</span>
                      <span>{formatDate(booking.createdAt)}</span>
                    </div>
                  </div>

                  {/* MAIN DETAILS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* LOCATIONS */}
                    <div className="space-y-2 md:col-span-1">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">
                          Pickup Location
                        </span>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          {booking.pickupLocation.address}
                        </p>
                      </div>
                      {booking.dropoffLocation && (
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">
                            Dropoff Location
                          </span>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {booking.dropoffLocation.address}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* DRIVER & RECIPIENT (PHASE 74) */}
                    <div className="space-y-2 md:col-span-1 border-t md:border-t-0 md:border-l border-[#262a33] pt-3 md:pt-0 md:pl-6">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">
                          Assigned Chauffeur
                        </span>
                        {booking.driver ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-7 w-7 rounded-full bg-emerald-900/60 border border-emerald-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                              {booking.driver.displayName?.[0] || 'D'}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block">
                                {booking.driver.displayName || 'Professional Chauffeur'}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {booking.driver.drivingExperienceYears} yrs exp •{' '}
                                {booking.driver.primaryServiceArea || 'Verified'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic block mt-0.5">
                            Matching nearby driver…
                          </span>
                        )}
                      </div>

                      {/* PHASE 74 RECIPIENT BADGE */}
                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">
                          Service Recipient
                        </span>
                        {booking.serviceRecipient?.isForSomeoneElse ? (
                          <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-xs mt-1">
                            <span className="text-purple-300 font-bold block">
                              For: {booking.serviceRecipient.fullName}
                            </span>
                            <span className="text-slate-400 text-[10px] font-mono">
                              Mobile: {booking.serviceRecipient.phone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 block font-semibold mt-0.5">
                            Service For: You
                          </span>
                        )}
                      </div>
                    </div>

                    {/* FINANCIALS & RATING */}
                    <div className="space-y-2 md:col-span-1 border-t md:border-t-0 md:border-l border-[#262a33] pt-3 md:pt-0 md:pl-6 font-mono text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">
                          Total Amount
                        </span>
                        <span className="text-lg font-bold text-white block">
                          {formatCurrency(booking.fareAmount)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Payment Status:{' '}
                          <strong className="text-[#68dba9]">{booking.paymentStatus}</strong>
                        </span>
                      </div>

                      {booking.refundedAmount && booking.refundedAmount > 0 && (
                        <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300">
                          Refunded: {formatCurrency(booking.refundedAmount)}
                        </div>
                      )}

                      {booking.rating && (
                        <div className="pt-1">
                          <span className="text-[10px] uppercase text-slate-500 block mb-0.5">
                            Your Rating
                          </span>
                          <RatingStars value={booking.rating} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CANCELLATION REASON IF CANCELLED */}
                  {booking.status === 'CANCELLED' && booking.cancellationReason && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 font-mono">
                      Cancelled by {booking.cancelledBy || 'system'}: &quot;
                      {booking.cancellationReason}&quot;
                    </div>
                  )}

                  {/* BOTTOM ACTION BAR */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#262a33]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="px-4 py-2 bg-[#181c24] hover:bg-[#222733] text-white text-xs font-semibold rounded-xl border border-[#262a33] flex items-center gap-1.5 transition-colors"
                      >
                        <span>View Details</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>

                      {booking.invoiceNumber && (
                        <a
                          href={`/api/customer/bookings/${booking.id}/invoice/pdf`}
                          download={`invoice-${booking.invoiceNumber}.pdf`}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">description</span>
                          <span>Invoice</span>
                        </a>
                      )}

                      {booking.paymentId && booking.paymentStatus === 'CAPTURED' && (
                        <a
                          href={`/api/customer/payments/${booking.paymentId}/receipt/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold rounded-xl border border-purple-500/30 flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">receipt</span>
                          <span>Receipt</span>
                        </a>
                      )}

                      {booking.refundId && (
                        <a
                          href={`/api/customer/refunds/${booking.refundId}/pdf`}
                          download={`refund-${booking.refundNumber || 'doc'}.pdf`}
                          className="px-3 py-2 bg-amber-950/60 hover:bg-amber-900 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">
                            assignment_return
                          </span>
                          <span>Credit Note</span>
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {booking.isEligibleForBookAgain && (
                        <Link
                          href={`/bookings/new?bookAgain=${booking.id}`}
                          className="px-4 py-2 bg-[#68dba9] hover:bg-[#52c693] text-[#003825] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">replay</span>
                          <span>Book Again</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PAGINATION */}
        {!loading && !error && totalPages > 1 && (
          <div className="p-4 bg-[#0a0e16] border border-[#262a33] rounded-2xl flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-[#181c24] hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl border border-[#262a33]"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-[#181c24] hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl border border-[#262a33]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
