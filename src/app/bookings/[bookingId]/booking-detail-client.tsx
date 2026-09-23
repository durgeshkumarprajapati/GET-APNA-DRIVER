'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { RatingStars } from '@/components/ui/rating-stars';
import { useToast, ToastViewport } from '@/components/ui/toast';
import { DirectCallResponse } from '@/modules/calling/domain/types';
import { useTranslation } from '@/i18n/context';
import { BookingMessagePanel } from '@/components/booking/BookingMessagePanel';
import { PostTripPaymentCard } from '@/components/payment/PostTripPaymentCard';

interface BookingDetail {
  id: string;
  customerId?: string;
  status: string;
  bookingType: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  };
  dropoffLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  } | null;
  requestedStartTime: string | null;
  estimatedDurationMinutes: number | null;
  hireDurationMinutes?: number | null;
  hireStartAt?: string | null;
  hireEndAt?: string | null;
  customerNotes: string | null;
  requestedAt: string;
  assignedAt: string | null;
  driverEnRouteAt: string | null;
  driverArrivedAt: string | null;
  tripStartedAt: string | null;
  tripCompletedAt: string | null;
  cancelledAt: string | null;
  cancelledBy?: string | null;
  cancellationReason: string | null;
  expiresAt: string | null;
  preferredDriverProfileId: string | null;
  vehicleCategory?: { id: string; code: string; name: string } | null;
  pendingOffer?: { driverName: string | null; expiresAt: string } | null;
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

const STATUS_DOT_CLASS: Record<string, string> = {
  SEARCHING_DRIVER: 'bg-amber-400 animate-ping',
  DRIVER_ASSIGNED: 'bg-blue-400',
  DRIVER_EN_ROUTE: 'bg-cyan-400 animate-pulse',
  DRIVER_ARRIVED: 'bg-emerald-400 animate-pulse',
  TRIP_IN_PROGRESS: 'bg-indigo-400 animate-pulse',
  TRIP_COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-400',
  EXPIRED: 'bg-slate-500',
};

const STATUS_TEXT_CLASS: Record<string, string> = {
  SEARCHING_DRIVER: 'text-amber-400',
  DRIVER_ASSIGNED: 'text-blue-400',
  DRIVER_EN_ROUTE: 'text-cyan-400',
  DRIVER_ARRIVED: 'text-emerald-400',
  TRIP_IN_PROGRESS: 'text-indigo-400',
  TRIP_COMPLETED: 'text-emerald-400',
  CANCELLED: 'text-red-400',
  EXPIRED: 'text-slate-400',
};

export default function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { t, formatDate, statusLabel } = useTranslation();
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
  const [nowTime, setNowTime] = useState<number>(() => Date.now());
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [resolvedPickupAddress, setResolvedPickupAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (booking?.pickupLocation) {
      const addr = booking.pickupLocation.address;
      if (
        !addr ||
        addr === 'Current location selected' ||
        addr.startsWith('Coords:') ||
        addr.startsWith('Fetching address')
      ) {
        fetch(
          `/api/location/reverse-geocode?lat=${booking.pickupLocation.latitude}&lng=${booking.pickupLocation.longitude}`,
        )
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!cancelled && data?.address) {
              const formatted =
                data.address.formattedAddress ||
                [
                  data.address.addressLine1,
                  data.address.city,
                  data.address.state,
                  data.address.postalCode,
                ]
                  .filter(Boolean)
                  .join(', ');
              if (formatted) {
                setResolvedPickupAddress(formatted);
              }
            }
          })
          .catch(() => {});
      }
    }
    return () => {
      cancelled = true;
    };
  }, [booking]);

  useEffect(() => {
    const interval = setInterval(() => setNowTime(Date.now()), 2000);
    return () => clearInterval(interval);
  }, []);

  const [callingDriver, setCallingDriver] = useState(false);
  const [driverCallData, setDriverCallData] = useState<DirectCallResponse | null>(null);

  const handleCallDriver = async () => {
    try {
      setCallingDriver(true);
      const res = await fetch(`/api/customer/bookings/${bookingId}/call-driver`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t('customer.tracking.callInitiationFailed'));
      }
      setDriverCallData(data.data);
      showToast(t('customer.tracking.callInitiatedSuccess'), 'success');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : t('customer.tracking.callErrorGeneric'),
        'error',
      );
    } finally {
      setCallingDriver(false);
    }
  };

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
        setError(null);
      } else {
        const data = await res.json();
        setError(data.message || t('customer.tracking.loadFailedError'));
      }
    } catch {
      setError(t('customer.bookingsList.connectionError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setReviewError(t('customer.tracking.ratingRequiredError'));
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
        throw new Error(data.message || t('customer.tracking.reviewSubmitFailedError'));
      }
      setReview(data.review);
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : t('customer.tracking.reviewSubmitFailedError'),
      );
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
        showToast(data.message || t('customer.tracking.cancelFailedError'), 'error');
      }
    } catch {
      showToast(t('customer.tracking.cancelSendError'), 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
            {t('customer.tracking.loadingMessage')}
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (error || !booking) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-24">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <p className="text-red-400 font-medium text-sm">
              {error || t('customer.tracking.notFoundError')}
            </p>
            <Link
              href="/bookings"
              className="inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {t('customer.tracking.backToBookings')}
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const isCancellable = [
    'SEARCHING_DRIVER',
    'DRAFT',
    'DRIVER_ASSIGNED',
    'DRIVER_EN_ROUTE',
  ].includes(booking.status);

  const preferredDriverUnmatched =
    !!booking.preferredDriverProfileId &&
    !!booking.assignedDriver &&
    booking.assignedDriver.id !== booking.preferredDriverProfileId;

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/bookings" className="hover:text-emerald-400 transition-colors">
                {t('customer.nav.bookings')}
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">
                {t('customer.tracking.breadcrumbLiveTracker')}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              {t('customer.tracking.pageTitle')}
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
              {t('customer.booking.cancelBooking')}
            </button>
          )}
        </div>

        {/* Real-time Status Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 pb-6">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                {t('customer.tracking.currentStateLabel')}
              </span>
              <div className="text-2xl font-bold text-white flex flex-wrap items-center gap-3">
                <span
                  className={`h-3.5 w-3.5 rounded-full ${STATUS_DOT_CLASS[booking.status] ?? 'bg-slate-500'}`}
                />
                <span className={STATUS_TEXT_CLASS[booking.status] ?? 'text-slate-400'}>
                  {statusLabel(booking.status)}
                </span>
                {booking.vehicleCategory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 shadow-sm">
                    <span className="material-symbols-outlined text-sm">directions_car</span>
                    {booking.vehicleCategory.name}
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1 md:text-right">
              <div>
                {t('customer.tracking.requestedLabel', {
                  time: formatDate(booking.requestedAt),
                })}
              </div>
              {booking.expiresAt && booking.status === 'SEARCHING_DRIVER' && (
                <div>
                  {t('customer.tracking.expiresAtLabel', {
                    time: formatDate(booking.expiresAt),
                  })}
                </div>
              )}
            </div>
          </div>

          {preferredDriverUnmatched && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200">
              {t('customer.tracking.preferredDriverUnavailableNote')}
            </div>
          )}

          {booking.status === 'CANCELLED' && (
            <div className="p-5 rounded-2xl bg-red-950/60 border border-red-500/60 space-y-2">
              <div className="flex items-center gap-2.5 text-red-300 font-bold text-base">
                <span className="material-symbols-outlined text-xl">cancel</span>
                <span>
                  {booking.cancelledBy && booking.cancelledBy !== booking.customerId
                    ? 'Driver has cancelled the booking'
                    : 'You cancelled this booking'}
                </span>
              </div>
              {booking.cancellationReason && (
                <p className="text-xs text-red-200">
                  Reason: <span className="font-semibold">{booking.cancellationReason}</span>
                </p>
              )}
            </div>
          )}

          {/* Pending Offer — request sent to a specific driver, awaiting their response */}
          {booking.status === 'SEARCHING_DRIVER' && booking.pendingOffer && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <p className="text-xs text-amber-200">
                {new Date(booking.pendingOffer.expiresAt).getTime() <= nowTime
                  ? t('customer.tracking.offerExpiredRefreshing')
                  : t('customer.tracking.pendingOfferWaiting', {
                      driverName:
                        booking.pendingOffer.driverName ||
                        t('customer.bookingsList.professionalDriverFallback'),
                    })}
              </p>
            </div>
          )}

          {/* Assigned Driver Card */}
          {booking.assignedDriver && (
            <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {t('customer.tracking.assignedDriverTitle')}
              </h3>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-800/60 border border-emerald-500 flex items-center justify-center text-xl font-bold text-white uppercase">
                    {booking.assignedDriver.displayName?.[0] || 'D'}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">
                      {booking.assignedDriver.displayName ||
                        t('customer.bookingsList.professionalDriverFallback')}
                    </h4>
                    <p className="text-xs text-slate-300">
                      {t('customer.tracking.serviceAreaLabel', {
                        area:
                          booking.assignedDriver.primaryServiceArea ||
                          t('customer.tracking.serviceAreaFallback'),
                      })}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('customer.tracking.experienceLabel', {
                        years: booking.assignedDriver.drivingExperienceYears,
                      })}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={callingDriver}
                  onClick={handleCallDriver}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">call</span>
                  <span>
                    {callingDriver
                      ? t('customer.tracking.connecting')
                      : t('customer.tracking.callDriverBtn')}
                  </span>
                </button>
              </div>

              {driverCallData && (
                <div className="p-3 rounded-lg bg-emerald-900/40 border border-emerald-500/50 text-xs text-emerald-300 space-y-1 font-mono">
                  <div>
                    {t('customer.tracking.maskedCallSession', {
                      id: driverCallData.callSessionId.substring(0, 8),
                    })}
                  </div>
                  <div>
                    {t('customer.tracking.maskedCallerDriver', {
                      caller: driverCallData.callerPhoneMasked ?? '',
                      driver: driverCallData.recipientPhoneMasked ?? '',
                    })}
                  </div>
                  <div className="text-[11px] text-emerald-200">{driverCallData.instructions}</div>
                </div>
              )}
            </div>
          )}

          {/* Message Driver — available once a specific driver is
              associated with the booking (assigned, or currently offered
              while waiting for confirmation) */}
          {(booking.assignedDriver || booking.pendingOffer) && (
            <BookingMessagePanel
              viewerRole="CUSTOMER"
              apiBasePath={`/api/customer/bookings/${booking.id}/messages`}
              title={t('customer.tracking.messagesTitle', { defaultValue: 'Messages' })}
            />
          )}

          {/* Post-Trip Payment & Rate Your Driver */}
          {booking.status === 'TRIP_COMPLETED' && (
            <div className="space-y-6">
              <PostTripPaymentCard bookingId={booking.id} role="CUSTOMER" />

              <div className="p-6 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {review
                    ? t('customer.tracking.yourReviewTitle')
                    : t('customer.tracking.rateYourDriverTitle')}
                </h3>
                {review ? (
                  <div className="space-y-2">
                    <RatingStars value={review.rating} size="md" />
                    {review.comment && (
                      <p className="text-sm text-slate-300 italic">&quot;{review.comment}&quot;</p>
                    )}
                    <p className="text-[10px] text-slate-500">
                      {t('customer.tracking.submittedOn', { date: formatDate(review.createdAt) })}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <RatingStars value={reviewRating} size="lg" onChange={setReviewRating} />
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder={t('customer.tracking.reviewPlaceholder')}
                      className="w-full h-20 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    {reviewError && <p className="text-xs text-red-400">{reviewError}</p>}
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => void handleSubmitReview()}
                      className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm disabled:opacity-50 transition-colors"
                    >
                      {submittingReview
                        ? t('customer.tracking.submitting')
                        : t('customer.tracking.submitReviewBtn')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Driver Location Tracking Component */}
          {driverLocation && (
            <div className="p-6 rounded-xl bg-slate-900/80 border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  {t('customer.tracking.liveLocationTitle')}
                </h3>
                <span className="text-[10px] text-slate-400">
                  {t('customer.tracking.updatedLabel', {
                    time: formatDate(driverLocation.capturedAt),
                  })}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase">
                    {t('customer.tracking.latitudeLabel')}
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {driverLocation.latitude.toFixed(6)}°
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase">
                    {t('customer.tracking.longitudeLabel')}
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {driverLocation.longitude.toFixed(6)}°
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase">
                    {t('customer.tracking.headingLabel')}
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {driverLocation.heading != null
                      ? `${driverLocation.heading}°`
                      : t('customer.tracking.notAvailable')}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase">
                    {t('customer.tracking.speedLabel')}
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {driverLocation.speed != null
                      ? `${driverLocation.speed.toFixed(1)} km/h`
                      : t('customer.tracking.zeroSpeed')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Lifecycle Milestones Timeline */}
          <div className="pt-2 border-t border-slate-700/60">
            <span className="text-xs font-medium text-slate-400 uppercase block mb-3">
              {t('customer.tracking.timelineTitle')}
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div
                className={`p-3 rounded-xl border ${booking.driverEnRouteAt ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}
              >
                <div className="font-bold">{t('customer.tracking.milestoneEnRoute')}</div>
                <div className="text-[10px] mt-1">
                  {booking.driverEnRouteAt
                    ? formatDate(booking.driverEnRouteAt)
                    : t('customer.tracking.pendingLabel')}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${booking.driverArrivedAt ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}
              >
                <div className="font-bold">{t('customer.tracking.milestoneArrived')}</div>
                <div className="text-[10px] mt-1">
                  {booking.driverArrivedAt
                    ? formatDate(booking.driverArrivedAt)
                    : t('customer.tracking.pendingLabel')}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${booking.tripStartedAt ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}
              >
                <div className="font-bold">{t('customer.tracking.milestoneTripStarted')}</div>
                <div className="text-[10px] mt-1">
                  {booking.tripStartedAt
                    ? formatDate(booking.tripStartedAt)
                    : t('customer.tracking.pendingLabel')}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${booking.tripCompletedAt ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}
              >
                <div className="font-bold">{t('customer.tracking.milestoneCompleted')}</div>
                <div className="text-[10px] mt-1">
                  {booking.tripCompletedAt
                    ? formatDate(booking.tripCompletedAt)
                    : t('customer.tracking.pendingLabel')}
                </div>
              </div>
            </div>
          </div>

          {/* Pickup, Dropoff & Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase">
                {t('customer.booking.pickupLocation')}
              </span>
              <p className="text-sm font-semibold text-white">
                {resolvedPickupAddress ||
                  (booking.pickupLocation.address !== 'Current location selected' &&
                  !booking.pickupLocation.address.startsWith('Coords:') &&
                  !booking.pickupLocation.address.startsWith('Fetching address')
                    ? booking.pickupLocation.address
                    : t('customer.tracking.coordsLabel', {
                        lat: booking.pickupLocation.latitude.toFixed(4),
                        lng: booking.pickupLocation.longitude.toFixed(4),
                      }))}
              </p>
              <p className="text-xs text-slate-400">
                {t('customer.tracking.coordsLabel', {
                  lat: booking.pickupLocation.latitude.toFixed(4),
                  lng: booking.pickupLocation.longitude.toFixed(4),
                })}
              </p>
            </div>

            {booking.dropoffLocation ? (
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 uppercase">
                  {t('customer.booking.destinationLocation', { defaultValue: 'Drop Location' })}
                </span>
                <p className="text-sm font-semibold text-white">
                  {booking.dropoffLocation.address}
                </p>
                <p className="text-xs text-slate-400">
                  {t('customer.tracking.coordsLabel', {
                    lat: booking.dropoffLocation.latitude.toFixed(4),
                    lng: booking.dropoffLocation.longitude.toFixed(4),
                  })}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 uppercase">
                  {t('customer.tracking.bookingTypeDurationLabel')}
                </span>
                <p className="text-sm font-semibold text-white font-['Space_Grotesk'] flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-xs">
                    {booking.bookingType}
                  </span>
                  {booking.hireDurationMinutes && (
                    <span>({Math.round(booking.hireDurationMinutes / 60)} Hours Hire)</span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {booking.hireStartAt
                    ? `Starts: ${formatDate(booking.hireStartAt)}`
                    : 'No drop location required for driver hire'}
                </p>
              </div>
            )}
          </div>

          {booking.customerNotes && (
            <div className="pt-2 border-t border-slate-700/60">
              <span className="text-xs font-medium text-slate-400 uppercase block mb-1">
                {t('customer.tracking.customerNotesLabel')}
              </span>
              <p className="text-sm text-slate-200 bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
                {booking.customerNotes}
              </p>
            </div>
          )}

          {booking.cancellationReason && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300">
              {t('customer.tracking.cancellationReasonLabel', {
                reason: booking.cancellationReason,
              })}
            </div>
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">
                {t('customer.tracking.confirmCancelModalTitle')}
              </h3>
              <p className="text-xs text-slate-300">
                {t('customer.tracking.confirmCancelModalDesc')}
              </p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {t('customer.tracking.cancelReasonLabel')}
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t('customer.tracking.cancelReasonPlaceholder')}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg"
                >
                  {t('customer.tracking.keepBookingBtn')}
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2"
                >
                  {cancelling && (
                    <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                  )}
                  {t('customer.tracking.confirmCancelBtn')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </CustomerLayout>
  );
}
