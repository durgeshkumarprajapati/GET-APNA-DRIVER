'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { EmptyState } from '@/components/ui/empty-state';
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container p-6 rounded-2xl border border-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-primary">
              <span className="material-symbols-outlined text-base">calendar_month</span>
              <span>Customer Booking Management</span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
              Service History & Bookings
            </h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Manage your active, upcoming, completed, and cancelled chauffeur driver services.
            </p>
          </div>
          <Link
            href="/bookings/new"
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs rounded-xl shadow transition-colors text-center"
          >
            + Book Chauffeur Now
          </Link>
        </div>

        {/* STATUS TABS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
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
                  ? 'bg-primary text-on-primary font-bold shadow-lg'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-border'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  statusTab === tab.key
                    ? 'bg-on-primary/20 text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant border border-border'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* FILTERS & SEARCH */}
        <div className="bg-surface-container p-4 rounded-2xl border border-border flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">
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
              className="w-full pl-9 pr-3 py-2 bg-surface-container-high border border-border rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="bg-surface-container-high border border-border text-xs text-on-surface rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
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
              className="bg-surface-container-high border border-border text-xs text-on-surface rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="bg-surface-container-high border border-border text-xs text-on-surface rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* LOADING & ERROR */}
        {loading && (
          <div className="flex items-center justify-center p-12 bg-surface-container rounded-2xl border border-border">
            <div className="flex flex-col items-center gap-3">
              <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-xs font-mono text-on-surface-variant">Loading service history...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-error-container border border-error/30 rounded-2xl text-xs text-on-error-container font-mono">
            {error}
          </div>
        )}

        {/* BOOKINGS LIST */}
        {!loading && !error && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <EmptyState
                icon="calendar_today"
                title="No services found"
                message={
                  statusTab === 'UPCOMING'
                    ? 'No upcoming scheduled chauffeur rides.'
                    : statusTab === 'ACTIVE'
                      ? 'No active ride in progress.'
                      : statusTab === 'COMPLETED'
                        ? 'No completed driver trips yet.'
                        : statusTab === 'CANCELLED'
                          ? 'No cancelled services found.'
                          : 'Your booking history will appear here once you book a driver.'
                }
              >
                <Link
                  href="/bookings/new"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl transition-colors"
                >
                  Book Chauffeur Now
                </Link>
              </EmptyState>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-surface-container border border-border hover:border-primary/40 rounded-2xl p-6 shadow-sm transition-all space-y-4 text-on-surface"
                >
                  {/* TOP CARD BAR */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(booking.status)}
                      <span className="text-xs font-bold text-on-surface uppercase font-mono tracking-wider">
                        {booking.bookingType.replace(/_/g, ' ')}
                      </span>
                      {booking.vehicleCategory && (
                        <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono text-[10px] border border-border">
                          {booking.vehicleCategory.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-on-surface-variant">
                      <span>
                        Booking ID:{' '}
                        <strong className="text-on-surface">{booking.id.substring(0, 8)}...</strong>
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
                        <span className="text-[10px] uppercase font-mono text-on-surface-variant block">
                          Pickup Location
                        </span>
                        <p className="text-sm font-semibold text-on-surface mt-0.5">
                          {booking.pickupLocation.address}
                        </p>
                      </div>
                      {booking.dropoffLocation && (
                        <div>
                          <span className="text-[10px] uppercase font-mono text-on-surface-variant block">
                            Dropoff Location
                          </span>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {booking.dropoffLocation.address}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* DRIVER & RECIPIENT (PHASE 74) */}
                    <div className="space-y-2 md:col-span-1 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-6">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-on-surface-variant block">
                          Assigned Chauffeur
                        </span>
                        {booking.driver ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-xs font-bold text-primary uppercase">
                              {booking.driver.displayName?.[0] || 'D'}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-on-surface block">
                                {booking.driver.displayName || 'Professional Chauffeur'}
                              </span>
                              <span className="text-[10px] text-on-surface-variant block">
                                {booking.driver.drivingExperienceYears} yrs exp •{' '}
                                {booking.driver.primaryServiceArea || 'Verified'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface-variant italic block mt-0.5">
                            Matching nearby driver…
                          </span>
                        )}
                      </div>

                      {/* PHASE 74 RECIPIENT BADGE */}
                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-mono text-on-surface-variant block">
                          Service Recipient
                        </span>
                        {booking.serviceRecipient?.isForSomeoneElse ? (
                          <div className="p-2 rounded-lg bg-secondary-container/40 border border-secondary/30 text-xs mt-1">
                            <span className="text-secondary font-bold block">
                              For: {booking.serviceRecipient.fullName}
                            </span>
                            <span className="text-on-surface-variant text-[10px] font-mono">
                              Mobile: {booking.serviceRecipient.phone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface block font-semibold mt-0.5">
                            Service For: You
                          </span>
                        )}
                      </div>
                    </div>

                    {/* FINANCIALS & RATING */}
                    <div className="space-y-2 md:col-span-1 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-6 font-mono text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-on-surface-variant block">
                          Total Amount
                        </span>
                        <span className="text-lg font-bold text-on-surface block">
                          {formatCurrency(booking.fareAmount)}
                        </span>
                        <span className="text-[10px] text-on-surface-variant block">
                          Payment Status:{' '}
                          <strong className="text-primary">{booking.paymentStatus}</strong>
                        </span>
                      </div>

                      {booking.refundedAmount && booking.refundedAmount > 0 && (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-400">
                          Refunded: {formatCurrency(booking.refundedAmount)}
                        </div>
                      )}

                      {booking.rating && (
                        <div className="pt-1">
                          <span className="text-[10px] uppercase text-on-surface-variant block mb-0.5">
                            Your Rating
                          </span>
                          <RatingStars value={booking.rating} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CANCELLATION REASON IF CANCELLED */}
                  {booking.status === 'CANCELLED' && booking.cancellationReason && (
                    <div className="p-3 rounded-xl bg-error-container/60 border border-error/30 text-xs text-on-error-container font-medium flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-error shrink-0">cancel</span>
                      <span>
                        {booking.cancellationReason.toLowerCase().includes('rejected') ||
                        booking.cancellationReason === 'Booking rejected by driver'
                          ? `Booking rejected by driver`
                          : booking.cancellationReason === 'NO_ACTIVE_DRIVER_NEARBY'
                          ? `No active driver found near you`
                          : booking.cancelledBy
                          ? `Cancelled by driver: "${booking.cancellationReason}"`
                          : `Cancelled: "${booking.cancellationReason}"`}
                      </span>
                    </div>
                  )}

                  {/* BOTTOM ACTION BAR */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-lowest text-on-surface text-xs font-semibold rounded-xl border border-border flex items-center gap-1.5 transition-colors"
                      >
                        <span>View Details</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>

                      {booking.invoiceNumber && (
                        <a
                          href={`/api/customer/bookings/${booking.id}/invoice/pdf`}
                          download={`invoice-${booking.invoiceNumber}.pdf`}
                          className="px-3 py-2 bg-surface-container-high hover:bg-surface-container-lowest text-on-surface text-xs font-semibold rounded-xl border border-border flex items-center gap-1.5 transition-colors"
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
                          className="px-3 py-2 bg-surface-container-high hover:bg-surface-container-lowest text-secondary text-xs font-semibold rounded-xl border border-secondary/30 flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">receipt</span>
                          <span>Receipt</span>
                        </a>
                      )}

                      {booking.refundId && (
                        <a
                          href={`/api/customer/refunds/${booking.refundId}/pdf`}
                          download={`refund-${booking.refundNumber || 'doc'}.pdf`}
                          className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-colors"
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
                          className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
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
          <div className="p-4 bg-surface-container border border-border rounded-2xl flex items-center justify-between text-xs font-mono">
            <span className="text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-lowest disabled:opacity-40 text-on-surface rounded-xl border border-border"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-lowest disabled:opacity-40 text-on-surface rounded-xl border border-border"
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
