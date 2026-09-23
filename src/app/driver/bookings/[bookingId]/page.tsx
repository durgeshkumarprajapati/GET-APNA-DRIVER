'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';
import { LoadingState } from '@/components/ui/loading-state';
import { RatingStars } from '@/components/ui/rating-stars';
import { useToast, ToastViewport } from '@/components/ui/toast';
import { RidePinModal } from '@/components/driver/ride-pin-modal';
import { UnifiedMap } from '@/components/maps/unified-map';
import type { MapMarkerDefinition } from '@/modules/maps/domain/map-types';
import { DirectCallResponse } from '@/modules/calling/domain/types';
import { BookingMessagePanel } from '@/components/booking/BookingMessagePanel';

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
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
}

interface BookingReview {
  rating: number;
  comment: string | null;
  createdAt: string;
}

import { SmartPickupAssistant } from '@/components/trip-intelligence/SmartPickupAssistant';
import type { TripIntelligenceResult } from '@/modules/trip-intelligence/trip-intelligence-types';
import { DriverPickupReliabilityCard } from '@/components/trip-reliability/DriverPickupReliabilityCard';
import type { DriverReliabilityView } from '@/modules/trip-reliability/trip-reliability-types';
import { LocationETACard } from '@/components/location-intelligence/LocationETACard';
import { SmartJourneyCard } from '@/components/trip-execution/SmartJourneyCard';
import type { DriverJourneyDTO } from '@/modules/trip-execution/application/journey-orchestration-service';
import { PostTripPaymentCard } from '@/components/payment/PostTripPaymentCard';

const BOOKING_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SEARCHING_DRIVER: 'Searching Driver',
  DRIVER_ASSIGNED: 'Driver Assigned',
  DRIVER_EN_ROUTE: 'Driver En Route',
  DRIVER_ARRIVED: 'Driver Arrived',
  TRIP_IN_PROGRESS: 'Service In Progress',
  TRIP_COMPLETED: 'Service Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
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
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [intelligence, setIntelligence] = useState<TripIntelligenceResult | null>(null);
  const [reliability, setReliability] = useState<DriverReliabilityView | null>(null);
  const [locationIntel, setLocationIntel] = useState<Record<string, unknown> | null>(null);
  const [journeyData, setJourneyData] = useState<DriverJourneyDTO | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    fetch(`/api/driver/bookings/${bookingId}/journey`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.journey) setJourneyData(data.journey);
      })
      .catch(() => {});

    fetch(`/api/driver/bookings/${bookingId}/trip-intelligence`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.intelligence) setIntelligence(data.intelligence);
      })
      .catch(() => {});

    fetch(`/api/driver/bookings/${bookingId}/reliability`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data) setReliability(data.data);
      })
      .catch(() => {});

    fetch(`/api/driver/bookings/${bookingId}/location-intelligence`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.locationIntelligence) setLocationIntel(data.locationIntelligence);
      })
      .catch(() => {});
  }, [bookingId]);

  const [callingCustomer, setCallingCustomer] = useState(false);
  const [customerCallData, setCustomerCallData] = useState<DirectCallResponse | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const handleCallCustomer = async () => {
    try {
      setCallingCustomer(true);
      const res = await fetch(`/api/driver/bookings/${bookingId}/call-customer`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to initiate customer call');
      }
      setCustomerCallData(data.data);
      showToast('Call initiated! Connecting to customer via proxy.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error calling customer', 'error');
    } finally {
      setCallingCustomer(false);
    }
  };

  const handleVerifyAndStartPin = async (ridePin: string) => {
    setActionPending(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/driver/bookings/${bookingId}/start-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ridePin }),
      });
      const data = await res.json();
      if (res.ok) {
        setBooking(data.booking);
        setActionMessage('Service PIN verified. Service In Progress.');
        showToast('Service PIN verified successfully! Service started.', 'success');
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } finally {
      setActionPending(false);
    }
  };

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
          setError('Failed to load booking details.');
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
      showToast('Error updating booking status.', 'error');
    } finally {
      setActionPending(false);
    }
  };

  const handleCancelTrip = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/driver/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setBooking(data.booking);
        setShowCancelModal(false);
        setCancelReason('');
        showToast('Booking cancelled. The customer has been notified.', 'success');
      } else {
        showToast(data.message || 'Failed to cancel booking.', 'error');
      }
    } catch {
      showToast('Error cancelling booking.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <DriverLayout>
        <div className="flex items-center justify-center py-24">
          <LoadingState message="Loading booking journey…" />
        </div>
      </DriverLayout>
    );
  }

  if (error || !booking) {
    return (
      <DriverLayout>
        <div className="flex items-center justify-center py-24">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <p className="text-red-400 font-medium text-sm">{error || 'Booking not found.'}</p>
            <Link
              href="/driver/bookings"
              className="inline-flex min-h-[48px] items-center justify-center px-4 py-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-xs font-semibold rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              ← Back to Assigned Bookings
            </Link>
          </div>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <div className="flex flex-col w-full gap-6">
        {journeyData && (
          <SmartJourneyCard
            journey={journeyData}
            role="DRIVER"
            onVerifyPinClick={() => setIsPinModalOpen(true)}
            onCallCustomer={handleCallCustomer}
          />
        )}
        <PostTripPaymentCard bookingId={bookingId} role="DRIVER" />
        {locationIntel && <LocationETACard locationIntelligence={locationIntel} variant="driver" />}
        {intelligence && <SmartPickupAssistant intelligence={intelligence} bookingId={bookingId} />}
        {reliability && <DriverPickupReliabilityCard reliability={reliability} />}
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/driver/bookings" className="hover:text-emerald-400 transition-colors">
                Assigned Bookings
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
                Current Booking Status
              </span>
              <span className="text-xl font-bold text-white uppercase tracking-wide">
                {bookingStatusLabel(booking.status)}
              </span>
            </div>
            <span className="h-3.5 w-3.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {booking.status === 'CANCELLED' && (
            <div className="p-5 rounded-2xl bg-red-950/60 border border-red-500/60 space-y-2">
              <div className="flex items-center gap-2.5 text-red-300 font-bold text-base">
                <span className="material-symbols-outlined text-xl">cancel</span>
                <span>
                  {booking.cancelledBy
                    ? 'You have cancelled this booking'
                    : 'Booking has been cancelled'}
                </span>
              </div>
              {booking.cancellationReason && (
                <p className="text-xs text-red-200">
                  Cancellation Reason:{' '}
                  <span className="font-semibold">{booking.cancellationReason}</span>
                </p>
              )}
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase block">
                Next Journey Step & Communication
              </span>
              {[
                'DRIVER_ASSIGNED',
                'DRIVER_EN_ROUTE',
                'DRIVER_ARRIVED',
                'TRIP_IN_PROGRESS',
                'TRIP_COMPLETED',
              ].includes(booking.status) && (
                <button
                  type="button"
                  disabled={callingCustomer}
                  onClick={handleCallCustomer}
                  className="min-h-[48px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                >
                  <span className="material-symbols-outlined text-sm">call</span>
                  <span>{callingCustomer ? 'Calling…' : 'Call Customer'}</span>
                </button>
              )}
            </div>

            {customerCallData && (
              <div className="p-3 rounded-lg bg-emerald-900/40 border border-emerald-500/50 text-xs text-emerald-300 space-y-1 font-mono">
                <div>Proxy Session ID: {customerCallData.callSessionId.substring(0, 8)}</div>
                <div>
                  Masked Driver: {customerCallData.callerPhoneMasked} → Masked Customer:{' '}
                  {customerCallData.recipientPhoneMasked}
                </div>
                <div className="text-[11px] text-emerald-200">{customerCallData.instructions}</div>
              </div>
            )}

            <BookingMessagePanel
              viewerRole="DRIVER"
              apiBasePath={`/api/driver/bookings/${bookingId}/messages`}
              title="Message Customer"
            />

            {booking.status === 'DRIVER_ASSIGNED' && (
              <button
                type="button"
                onClick={() =>
                  handleStatusAction('start-en-route', 'Status updated: Driver is En Route.')
                }
                disabled={actionPending}
                className="w-full min-h-[48px] py-4 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                {actionPending && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                🚀 Start Journey to Pickup (En Route)
              </button>
            )}

            {booking.status === 'DRIVER_EN_ROUTE' && (
              <button
                type="button"
                onClick={() =>
                  handleStatusAction('arrive', 'Status updated: Driver Arrived at pickup.')
                }
                disabled={actionPending}
                className="w-full min-h-[48px] py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              >
                {actionPending && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                📍 Mark Arrived at Pickup Location
              </button>
            )}

            {['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE'].includes(booking.status) && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={actionPending}
                className="w-full min-h-[48px] py-2.5 bg-slate-800 hover:bg-red-950/60 active:bg-red-950 border border-slate-700 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 hover:text-red-300 font-semibold rounded-xl transition-all text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
              >
                Cancel Booking
              </button>
            )}

            {booking.status === 'DRIVER_ARRIVED' && (
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                disabled={actionPending}
                className="w-full min-h-[48px] py-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                {actionPending && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                🔑 Verify Service PIN & Start Service
              </button>
            )}

            {booking.status === 'TRIP_IN_PROGRESS' && (
              <button
                type="button"
                onClick={() =>
                  handleStatusAction(
                    'complete',
                    'Service completed successfully! Availability restored to AVAILABLE.',
                  )
                }
                disabled={actionPending}
                className="w-full min-h-[48px] py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              >
                {actionPending && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                🏁 Complete Service
              </button>
            )}

            {booking.status === 'TRIP_COMPLETED' && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                <div className="text-center text-emerald-400 font-bold text-sm">
                  ✓ Service Successfully Completed!
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
              <div className="mt-3">
                {(() => {
                  const markers: MapMarkerDefinition[] = [
                    {
                      id: 'pickup',
                      position: {
                        latitude: booking.pickupLocation.latitude,
                        longitude: booking.pickupLocation.longitude,
                      },
                      type: 'PICKUP',
                      title: 'Customer Pickup Location',
                      snippet: booking.pickupLocation.address,
                    },
                  ];
                  return (
                    <UnifiedMap
                      markers={markers}
                      height="260px"
                      fitBounds={true}
                      showControls={true}
                      ariaLabel="Customer pickup map for driver"
                    />
                  );
                })()}
              </div>
            </div>

            {/* Fare & Driver Earnings Financial Breakdown */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase block font-mono">
                Service Earnings & Commission
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
                <span>Estimated Driver Payout:</span>
                <span>N/A (Calculated upon settlement)</span>
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

      <RidePinModal
        isOpen={isPinModalOpen}
        bookingId={booking.id}
        onClose={() => setIsPinModalOpen(false)}
        onVerifyAndStart={handleVerifyAndStartPin}
      />

      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-white">Cancel This Booking?</h3>
            <p className="text-xs text-slate-300">
              The customer will be notified immediately, and any payment already captured for this
              booking will be automatically refunded.
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Reason (Optional)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Vehicle breakdown, emergency"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="min-h-[48px] px-4 py-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-200 text-xs font-semibold rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelTrip}
                disabled={cancelling}
                className="min-h-[48px] px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
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

      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </DriverLayout>
  );
}
