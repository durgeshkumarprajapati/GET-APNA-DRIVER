'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/ui/loading-state';
import { useTranslation } from '@/i18n/context';

interface Booking {
  id: string;
  status: string;
  bookingType: string;
  pickupLocation: {
    address: string;
    label: string | null;
  };
  createdAt: string;
  customerId?: string;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  assignedDriver?: {
    displayName: string | null;
  } | null;
}

const STATUS_TONE: Record<string, string> = {
  SEARCHING_DRIVER: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse',
  DRIVER_ASSIGNED: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  CANCELLED: 'bg-red-500/20 text-red-300 border border-red-500/30',
  EXPIRED: 'bg-slate-700 text-slate-400 border border-slate-600',
};

export default function BookingsListPage() {
  const { t, formatDate, statusLabel } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch('/api/bookings');
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings || []);
        } else {
          setError(t('customer.bookingsList.loadFailed'));
        }
      } catch {
        setError(t('customer.bookingsList.connectionError'));
      } finally {
        setLoading(false);
      }
    };

    void fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusBadge = (status: string) => (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        STATUS_TONE[status] ?? 'bg-slate-700 text-slate-300'
      }`}
    >
      {statusLabel(status)}
    </span>
  );

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow={t('customer.bookingsList.eyebrow')}
          title={t('customer.nav.bookings')}
          subtitle={t('customer.bookingsList.subtitle')}
          actions={
            <Link
              href="/bookings/new"
              className="inline-flex items-center justify-center min-h-[48px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow transition-colors text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              {t('customer.bookingsList.createNew')}
            </Link>
          }
        />

        {loading ? (
          <LoadingState message={t('customer.bookingsList.loadingMessage')} />
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm text-center animate-fade-in">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-12 text-center space-y-4 animate-fade-in-up">
            <p className="text-slate-300 font-medium text-lg">
              {t('customer.bookingsList.emptyTitle')}
            </p>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {t('customer.bookingsList.emptyBody')}
            </p>
            <Link
              href="/bookings/new"
              className="inline-flex items-center justify-center min-h-[48px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              {t('customer.bookingsList.bookNowCta')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in-up">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl hover:border-slate-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(booking.status)}
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t(`booking.types.${booking.bookingType}`)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {booking.pickupLocation.address}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('customer.bookingsList.requestedOn', {
                      date: formatDate(booking.createdAt),
                    })}
                  </p>
                  {booking.assignedDriver && (
                    <p className="text-xs text-emerald-400 font-medium">
                      {t('customer.bookingsList.assignedDriverLabel', {
                        name:
                          booking.assignedDriver.displayName ||
                          t('customer.bookingsList.professionalDriverFallback'),
                      })}
                    </p>
                  )}
                  {booking.status === 'CANCELLED' && (
                    <p className="text-xs text-red-400 font-medium">
                      {booking.cancelledBy &&
                      booking.customerId &&
                      booking.cancelledBy !== booking.customerId
                        ? `Driver has cancelled the booking${booking.cancellationReason ? `: "${booking.cancellationReason}"` : ''}`
                        : `Cancelled${booking.cancellationReason ? `: "${booking.cancellationReason}"` : ''}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {booking.status === 'TRIP_COMPLETED' && (
                    <Link
                      href={`/bookings/new?bookAgain=${booking.id}`}
                      className="w-full md:w-auto inline-flex items-center justify-center min-h-[40px] px-4 py-2 bg-[#25a475] hover:bg-[#68dba9] active:bg-[#1c7d5c] text-[#00311f] font-semibold text-xs rounded-lg transition-colors text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                    >
                      {t('customer.dashboard.bookAgain')}
                    </Link>
                  )}
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="w-full md:w-auto inline-flex items-center justify-center min-h-[40px] px-4 py-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-200 font-semibold text-xs rounded-lg transition-colors text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  >
                    {t('customer.bookingsList.viewStatusTracker')} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
