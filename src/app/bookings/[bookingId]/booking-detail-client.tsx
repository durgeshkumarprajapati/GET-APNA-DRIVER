'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { RatingStars } from '@/components/ui/rating-stars';
import { useToast, ToastViewport } from '@/components/ui/toast';

interface BookingDetail {
  id: string;
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
  requestedAt: string;
  assignedAt: string | null;
  driverEnRouteAt: string | null;
  driverArrivedAt: string | null;
  tripStartedAt: string | null;
  tripCompletedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  expiresAt: string | null;
  assignedDriver?: {
    id: string;
    displayName: string | null;
    profileImageUrl: string | null;
    primaryServiceArea: string | null;
    drivingExperienceYears: number;
  } | null;
}

interface BookingReview {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
}

interface DriverLocationSnapshot {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  capturedAt: string;
}

export default function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const { toast, showToast, dismissToast } = useToast();
  const [review, setReview] = useState<BookingReview | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
        setError(null);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to load booking details.');
      }
    } catch {
      setError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const fetchDriverLocation = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/driver-location`);
      if (res.ok) {
        const data = await res.json();
        setDriverLocation(data.location);
      } else {
        setDriverLocation(null);
      }
    } catch {
      // Non-critical tracking poll
    }
  }, [bookingId]);

  // Initial fetch and polling setup
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (isMounted) await fetchBooking();
    };
    void run();

    const interval = setInterval(() => {
      if (isMounted) void fetchBooking();
    }, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchBooking]);

  // Real-time SSE Stream listener
  useEffect(() => {
    if (!bookingId) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/bookings/${bookingId}/stream`);

      eventSource.addEventListener('booking_update', () => {
        void fetchBooking();
      });

      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch {
      // Fall back to polling
    }

    return () => {
      eventSource?.close();
    };
  }, [bookingId, fetchBooking]);

  // Live driver location polling during active states
  useEffect(() => {
    const activeStates = [
      'DRIVER_ASSIGNED',
      'DRIVER_EN_ROUTE',
      'DRIVER_ARRIVED',
      'TRIP_IN_PROGRESS',
    ];
    if (!booking || !activeStates.includes(booking.status)) {
      return;
    }

    let isMounted = true;
    const poll = async () => {
      if (isMounted) await fetchDriverLocation();
    };

    void poll();
    const locInterval = setInterval(() => {
      void poll();
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(locInterval);
    };
  }, [booking?.status, fetchDriverLocation, booking]);

  // Once the trip is completed, check whether a review already exists.
  useEffect(() => {
    if (!booking || booking.status !== 'TRIP_COMPLETED') return;
    let isMounted = true;
    fetch(`/api/bookings/${bookingId}/review`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) setReview(data.review);
      })
      .catch(() => {
        // Non-critical — the "Rate Your Driver" form simply stays available.
      });
    return () => {
      isMounted = false;
    };
  }, [booking, bookingId]);

  const handleSubmitReview = async () => {
    if (reviewRating < 1) {
      setReviewError('Please select a star rating.');
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit review.');
      }
      setReview(data.review);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelBooking = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || 'Cancelled by customer' }),
      });
      const data = await res.json();
      if (res.ok) {
        setBooking(data.booking);
        setShowCancelModal(false);
      } else {
        showToast(data.message || 'Failed to cancel booking.', 'error');
      }
    } catch {
      showToast('Error sending cancel request.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
          Loading booking status...
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <p className="text-red-400 font-medium text-sm">{error || 'Booking not found.'}</p>
          <Link
            href="/bookings"
            className="inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            ← Back to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const isCancellable = [
    'SEARCHING_DRIVER',
    'DRAFT',
    'DRIVER_ASSIGNED',
    'DRIVER_EN_ROUTE',
  ].includes(booking.status);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/profile" className="hover:text-emerald-400 transition-colors">
                Customer Portal
              </Link>
              <span>/</span>
              <Link href="/bookings" className="hover:text-emerald-400 transition-colors">
                Bookings
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">Live Trip Tracker</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Booking Tracker
              <span className="text-xs font-normal text-slate-400 font-mono">
                ({booking.id.substring(0, 8)})
              </span>
            </h1>
          </div>

          {isCancellable && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white font-semibold text-xs rounded-xl shadow transition-colors"
            >
              Cancel Booking
            </button>
          )}
        </div>

        {/* Real-time Status Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 pb-6">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                Current Booking State
              </span>
              <div className="text-2xl font-bold text-white flex items-center gap-3">
                {booking.status === 'SEARCHING_DRIVER' && (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-amber-400">Searching for Nearby Driver...</span>
                  </>
                )}
                {booking.status === 'DRIVER_ASSIGNED' && (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full bg-blue-400" />
                    <span className="text-blue-400">Driver Assigned</span>
                  </>
                )}
                {booking.status === 'DRIVER_EN_ROUTE' && (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-cyan-400">Driver En Route to Pickup</span>
                  </>
                )}
                {booking.status === 'DRIVER_ARRIVED' && (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400">Driver Arrived at Pickup</span>
                  </>
                )}
                {booking.status === 'TRIP_IN_PROGRESS' && (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-indigo-400">Trip In Progress</span>
                  </>
                )}
                {booking.status === 'TRIP_COMPLETED' && (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-400">Trip Completed</span>
                  </>
                )}
                {booking.status === 'CANCELLED' && (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full bg-red-400" />
                    <span className="text-red-400">Booking Cancelled</span>
                  </>
                )}
                {booking.status === 'EXPIRED' && (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full bg-slate-500" />
                    <span className="text-slate-400">Search Expired</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1 md:text-right">
              <div>Requested: {new Date(booking.requestedAt).toLocaleTimeString()}</div>
              {booking.expiresAt && booking.status === 'SEARCHING_DRIVER' && (
                <div>Expires At: {new Date(booking.expiresAt).toLocaleTimeString()}</div>
              )}
            </div>
          </div>

          {/* Assigned Driver Card */}
          {booking.assignedDriver && (
            <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Assigned Driver Profile
              </h3>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-emerald-800/60 border border-emerald-500 flex items-center justify-center text-xl font-bold text-white uppercase">
                  {booking.assignedDriver.displayName?.[0] || 'D'}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    {booking.assignedDriver.displayName || 'Professional Driver'}
                  </h4>
                  <p className="text-xs text-slate-300">
                    Service Area: {booking.assignedDriver.primaryServiceArea || 'Delhi NCR'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Experience: {booking.assignedDriver.drivingExperienceYears} Years
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rate Your Driver */}
          {booking.status === 'TRIP_COMPLETED' && (
            <div className="p-6 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-4">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {review ? 'Your Review' : 'Rate Your Driver'}
              </h3>
              {review ? (
                <div className="space-y-2">
                  <RatingStars value={review.rating} size="md" />
                  {review.comment && (
                    <p className="text-sm text-slate-300 italic">&quot;{review.comment}&quot;</p>
                  )}
                  <p className="text-[10px] text-slate-500">
                    Submitted {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <RatingStars value={reviewRating} size="lg" onChange={setReviewRating} />
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience (optional)…"
                    className="w-full h-20 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {reviewError && <p className="text-xs text-red-400">{reviewError}</p>}
                  <button
                    type="button"
                    disabled={submittingReview}
                    onClick={() => void handleSubmitReview()}
                    className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    {submittingReview ? 'Submitting…' : 'Submit Review'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Live Driver Location Tracking Component */}
          {driverLocation && (
            <div className="p-6 rounded-xl bg-slate-900/80 border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  Live Driver Location Tracking
                </h3>
                <span className="text-[10px] text-slate-400">
                  Updated: {new Date(driverLocation.capturedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase">Latitude</span>
                  <span className="font-mono text-white font-semibold">
                    {driverLocation.latitude.toFixed(6)}°
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase">Longitude</span>
                  <span className="font-mono text-white font-semibold">
                    {driverLocation.longitude.toFixed(6)}°
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase">Heading</span>
                  <span className="font-mono text-white font-semibold">
                    {driverLocation.heading != null ? `${driverLocation.heading}°` : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase">Speed</span>
                  <span className="font-mono text-white font-semibold">
                    {driverLocation.speed != null
                      ? `${driverLocation.speed.toFixed(1)} km/h`
                      : '0 km/h'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Lifecycle Milestones Timeline */}
          <div className="pt-2 border-t border-slate-700/60">
            <span className="text-xs font-medium text-slate-400 uppercase block mb-3">
              Trip Journey Timeline
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div
                className={`p-3 rounded-xl border ${booking.driverEnRouteAt ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}
              >
                <div className="font-bold">1. En Route</div>
                <div className="text-[10px] mt-1">
                  {booking.driverEnRouteAt
                    ? new Date(booking.driverEnRouteAt).toLocaleTimeString()
                    : 'Pending'}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${booking.driverArrivedAt ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}
              >
                <div className="font-bold">2. Arrived</div>
                <div className="text-[10px] mt-1">
                  {booking.driverArrivedAt
                    ? new Date(booking.driverArrivedAt).toLocaleTimeString()
                    : 'Pending'}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${booking.tripStartedAt ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}
              >
                <div className="font-bold">3. Trip Started</div>
                <div className="text-[10px] mt-1">
                  {booking.tripStartedAt
                    ? new Date(booking.tripStartedAt).toLocaleTimeString()
                    : 'Pending'}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${booking.tripCompletedAt ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}
              >
                <div className="font-bold">4. Completed</div>
                <div className="text-[10px] mt-1">
                  {booking.tripCompletedAt
                    ? new Date(booking.tripCompletedAt).toLocaleTimeString()
                    : 'Pending'}
                </div>
              </div>
            </div>
          </div>

          {/* Pickup & Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase">Pickup Location</span>
              <p className="text-sm font-semibold text-white">{booking.pickupLocation.address}</p>
              <p className="text-xs text-slate-400">
                Coords: {booking.pickupLocation.latitude.toFixed(4)}°,{' '}
                {booking.pickupLocation.longitude.toFixed(4)}°
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase">
                Booking Type & Duration
              </span>
              <p className="text-sm font-semibold text-white">
                {booking.bookingType.replace('_', ' ')}
              </p>
              <p className="text-xs text-slate-400">
                Est. Duration: {booking.estimatedDurationMinutes || 60} Minutes
              </p>
            </div>
          </div>

          {booking.customerNotes && (
            <div className="pt-2 border-t border-slate-700/60">
              <span className="text-xs font-medium text-slate-400 uppercase block mb-1">
                Customer Notes
              </span>
              <p className="text-sm text-slate-200 bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
                {booking.customerNotes}
              </p>
            </div>
          )}

          {booking.cancellationReason && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300">
              Reason for cancellation: {booking.cancellationReason}
            </div>
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">Confirm Cancellation</h3>
              <p className="text-xs text-slate-300">
                Are you sure you want to cancel this driver booking request? Cancellation fees or
                policy checks may apply depending on trip status.
              </p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Cancellation Reason (Optional)
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Plans changed"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg"
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2"
                >
                  {cancelling && (
                    <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                  )}
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
