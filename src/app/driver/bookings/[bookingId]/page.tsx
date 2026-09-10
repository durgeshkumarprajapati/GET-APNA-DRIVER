'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';
import { RatingStars } from '@/components/ui/rating-stars';
import { useToast, ToastViewport } from '@/components/ui/toast';

interface DriverBookingDetail {
  id: string;
  customerId: string;
  status: string;
  bookingType: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  };
  requestedStartTime: string | null;
  estimatedDurationMinutes: number | null;
  customerNotes: string | null;
  assignedAt: string | null;
  driverEnRouteAt: string | null;
  driverArrivedAt: string | null;
  tripStartedAt: string | null;
  tripCompletedAt: string | null;
  createdAt: string;
}

interface BookingReview {
  rating: number;
  comment: string | null;
  createdAt: string;
}

export default function DriverJourneyControlPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<DriverBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const { toast, showToast, dismissToast } = useToast();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [review, setReview] = useState<BookingReview | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/driver/bookings');
        if (res.ok && isMounted) {
          const data = await res.json();
          const found = (data.bookings as DriverBookingDetail[])?.find((b) => b.id === bookingId);
          if (found) {
            setBooking(found);
            setError(null);
          } else {
            setError('Booking assignment not found.');
          }
        } else if (isMounted) {
          setError('Failed to load trip details.');
        }
      } catch {
        if (isMounted) setError('Error connecting to server.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  useEffect(() => {
    if (!booking || booking.status !== 'TRIP_COMPLETED') return;
    let isMounted = true;
    fetch(`/api/bookings/${bookingId}/review`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.review) setReview(data.review);
      })
      .catch(() => {
        // Non-critical — the completion banner simply omits the review.
      });
    return () => {
      isMounted = false;
    };
  }, [booking, bookingId]);

  const handleStatusAction = async (endpoint: string, successText: string) => {
    setActionPending(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/driver/bookings/${bookingId}/${endpoint}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setBooking(data.booking);
        setActionMessage(successText);
      } else {
        showToast(data.message || 'Action failed.', 'error');
      }
    } catch {
      showToast('Error updating trip status.', 'error');
    } finally {
      setActionPending(false);
    }
  };

  if (loading) {
    return (
      <DriverLayout>
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
            Loading trip journey...
          </div>
        </div>
      </DriverLayout>
    );
  }

  if (error || !booking) {
    return (
      <DriverLayout>
        <div className="flex items-center justify-center py-24">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <p className="text-red-400 font-medium text-sm">{error || 'Trip not found.'}</p>
            <Link
              href="/driver/bookings"
              className="inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              ← Back to Assigned Trips
            </Link>
          </div>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <div className="flex flex-col w-full gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/driver/bookings" className="hover:text-emerald-400 transition-colors">
                Assigned Trips
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">Journey Control</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Driver Journey Controls
              <span className="text-xs font-normal text-slate-400 font-mono">
                ({booking.id.substring(0, 8)})
              </span>
            </h1>
          </div>
        </div>

        {actionMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm font-medium">
            ✓ {actionMessage}
          </div>
        )}

        {/* Current State & Primary Action Bar */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-700 pb-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">
                Current Trip State
              </span>
              <span className="text-xl font-bold text-white uppercase tracking-wide">
                {booking.status.replace(/_/g, ' ')}
              </span>
            </div>
            <span className="h-3.5 w-3.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Action Trigger Buttons */}
          <div className="space-y-3">
            <span className="text-xs font-medium text-slate-400 uppercase block">
              Next Journey Step
            </span>

            {booking.status === 'DRIVER_ASSIGNED' && (
              <button
                onClick={() =>
                  handleStatusAction('start-en-route', 'Status updated: Driver is En Route.')
                }
                disabled={actionPending}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                {actionPending && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                🚀 Start Journey to Pickup (En Route)
              </button>
            )}

            {booking.status === 'DRIVER_EN_ROUTE' && (
              <button
                onClick={() =>
                  handleStatusAction('arrive', 'Status updated: Driver Arrived at pickup.')
                }
                disabled={actionPending}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                {actionPending && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                📍 Mark Arrived at Pickup Location
              </button>
            )}

            {booking.status === 'DRIVER_ARRIVED' && (
              <button
                onClick={() =>
                  handleStatusAction('start-trip', 'Status updated: Trip In Progress.')
                }
                disabled={actionPending}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                {actionPending && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                🚗 Start Trip
              </button>
            )}

            {booking.status === 'TRIP_IN_PROGRESS' && (
              <button
                onClick={() =>
                  handleStatusAction(
                    'complete',
                    'Trip completed successfully! Availability restored to AVAILABLE.',
                  )
                }
                disabled={actionPending}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                {actionPending && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                🏁 Complete Trip
              </button>
            )}

            {booking.status === 'TRIP_COMPLETED' && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                <div className="text-center text-emerald-400 font-bold text-sm">
                  ✓ Trip Successfully Completed!
                </div>
                {review && (
                  <div className="pt-3 border-t border-emerald-500/20 space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block text-center">
                      Customer Rating
                    </span>
                    <div className="flex justify-center">
                      <RatingStars value={review.rating} size="md" />
                    </div>
                    {review.comment && (
                      <p className="text-xs text-slate-300 italic text-center">
                        &quot;{review.comment}&quot;
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Trip Details Card */}
          <div className="space-y-4 pt-4 border-t border-slate-700/60">
            <div>
              <span className="text-xs text-slate-400 uppercase block">Pickup Location</span>
              <p className="text-base font-semibold text-white mt-0.5">
                {booking.pickupLocation.address}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Lat: {booking.pickupLocation.latitude.toFixed(6)}, Lng:{' '}
                {booking.pickupLocation.longitude.toFixed(6)}
              </p>
            </div>

            {/* Fare & Driver Earnings Financial Breakdown */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase block font-mono">
                Trip Earnings & Commission
              </span>
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>Estimated Duration:</span>
                <span className="text-slate-200">
                  {booking.estimatedDurationMinutes ?? 30} mins
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>Platform Commission Rate:</span>
                <span className="text-slate-200">20.00%</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-emerald-400 pt-2 border-t border-slate-800">
                <span>Estimated Driver Payout (80%):</span>
                <span>
                  ₹
                  {booking.estimatedDurationMinutes
                    ? (Math.max(150, 100 + booking.estimatedDurationMinutes * 2) * 0.8).toFixed(2)
                    : '120.00'}
                </span>
              </div>
            </div>

            {booking.customerNotes && (
              <div>
                <span className="text-xs text-slate-400 uppercase block">Customer Notes</span>
                <p className="text-xs text-slate-200 bg-slate-900/60 p-3 rounded-lg border border-slate-700">
                  {booking.customerNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </DriverLayout>
  );
}
