'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';
import { useToast, ToastViewport } from '@/components/ui/toast';
import { BookingMessagePanel } from '@/components/booking/BookingMessagePanel';
import { LoadingState } from '@/components/ui/loading-state';

interface AssignmentOffer {
  id: string;
  bookingId: string;
  attemptNumber: number;
  status: string;
  offeredAt: string;
  expiresAt: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  };
  bookingType: string;
  requestedStartTime: string | null;
  customerNotes: string | null;
}

export default function DriverAssignmentOffersPage() {
  const [offers, setOffers] = useState<AssignmentOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [messagingBookingId, setMessagingBookingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { toast, showToast, dismissToast } = useToast();

  const fetchOffers = useCallback(async () => {
    try {
      const res = await fetch('/api/driver/assignment-offers');
      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers || []);
        setError(null);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to load assignment offers.');
      }
    } catch {
      setError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (isMounted) await fetchOffers();
    };
    void run();

    const interval = setInterval(() => {
      if (isMounted) void fetchOffers();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchOffers]);

  // Ticks independently of the 5s data poll so the countdown/expired state
  // shown below updates every second — without this, an offer's buttons
  // could sit disabled for up to 5s after actually expiring (or, worse,
  // *look* expired for up to 5s after the page loaded a stale snapshot)
  // with no visible indication of why.
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  // As soon as a PENDING offer's own countdown hits zero, refetch right
  // away instead of leaving a dead, disabled card on screen for up to 5
  // more seconds waiting on the regular poll — this is purely a "move it
  // out of the way faster" nicety, the server's expiresAt is still what
  // actually governs whether Accept/Reject succeeds.
  const refetchedForExpiry = useRef(new Set<string>());
  useEffect(() => {
    const newlyExpired = offers.some(
      (o) =>
        o.status === 'PENDING' &&
        new Date(o.expiresAt).getTime() <= now &&
        !refetchedForExpiry.current.has(o.id),
    );
    if (newlyExpired) {
      for (const o of offers) {
        if (o.status === 'PENDING' && new Date(o.expiresAt).getTime() <= now) {
          refetchedForExpiry.current.add(o.id);
        }
      }
      void fetchOffers();
    }
  }, [now, offers, fetchOffers]);

  const handleAccept = async (attemptId: string) => {
    setActioningId(attemptId);
    try {
      const res = await fetch(`/api/driver/assignment-offers/${attemptId}/accept`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Booking assignment accepted successfully!', 'success');
        void fetchOffers();
      } else {
        showToast(data.message || 'Failed to accept offer.', 'error');
      }
    } catch {
      showToast('Error accepting offer.', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    setActioningId(rejectModalId);
    try {
      const res = await fetch(`/api/driver/assignment-offers/${rejectModalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || 'Rejected by driver' }),
      });
      const data = await res.json();
      if (res.ok) {
        setRejectModalId(null);
        setRejectReason('');
        void fetchOffers();
      } else {
        showToast(data.message || 'Failed to reject offer.', 'error');
      }
    } catch {
      showToast('Error rejecting offer.', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const pendingOffers = offers.filter((o) => o.status === 'PENDING');
  const pastOffers = offers.filter((o) => o.status !== 'PENDING');

  return (
    <DriverLayout>
      <div className="flex flex-col w-full gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Booking Assignment Offers
            </h1>
          </div>

          <Link
            href="/driver/availability"
            className="min-h-[48px] flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            Manage Availability & GPS
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Pending Assignment Offers Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Incoming Assignment Offers ({pendingOffers.length})
            {pendingOffers.length > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </h2>

          {loading ? (
            <LoadingState message="Loading assignment offers…" />
          ) : pendingOffers.length === 0 ? (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 text-center space-y-2">
              <p className="text-slate-300 font-medium">No pending assignment offers.</p>
              <p className="text-xs text-slate-400">
                Keep your status set to <strong className="text-emerald-400">AVAILABLE</strong> and
                send live GPS updates to receive nearby booking requests.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in-up">
              {pendingOffers.map((offer) => {
                const expiresDate = new Date(offer.expiresAt);
                const secondsLeft = Math.max(0, Math.round((expiresDate.getTime() - now) / 1000));
                const isExpired = secondsLeft <= 0;

                return (
                  <div
                    key={offer.id}
                    className="bg-slate-800 border-2 border-emerald-500/60 rounded-2xl p-6 shadow-2xl space-y-4 relative overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-700 pb-4">
                      <div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          NEW BOOKING OFFER #{offer.attemptNumber}
                        </span>
                        <span className="ml-3 text-xs text-slate-400 uppercase font-mono">
                          {offer.bookingType.replace('_', ' ')}
                        </span>
                      </div>
                      {isExpired ? (
                        <div className="text-xs text-red-400 font-semibold">
                          Offer expired — refreshing…
                        </div>
                      ) : (
                        <div
                          className={`text-xs font-semibold ${secondsLeft <= 10 ? 'text-red-400' : 'text-amber-400'}`}
                        >
                          Expires in {secondsLeft}s ({expiresDate.toLocaleTimeString()})
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white">
                        {offer.pickupLocation.address}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Pickup Coords: {offer.pickupLocation.latitude.toFixed(4)}°,{' '}
                        {offer.pickupLocation.longitude.toFixed(4)}°
                      </p>

                      {offer.customerNotes && (
                        <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60 mt-2">
                          Notes: {offer.customerNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleAccept(offer.id)}
                        disabled={actioningId === offer.id || isExpired}
                        className="w-full sm:flex-1 min-h-[48px] py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                      >
                        {actioningId === offer.id && (
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        )}
                        Accept Assignment Offer
                      </button>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setRejectModalId(offer.id)}
                          disabled={actioningId === offer.id || isExpired}
                          className="flex-1 sm:flex-initial min-h-[48px] px-5 py-3 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 font-semibold text-sm rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMessagingBookingId((prev) =>
                              prev === offer.bookingId ? null : offer.bookingId,
                            )
                          }
                          className="flex-1 sm:flex-initial min-h-[48px] px-4 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                        >
                          <span className="material-symbols-outlined text-base">chat</span>
                          Message Customer
                        </button>
                      </div>
                    </div>

                    {messagingBookingId === offer.bookingId && (
                      <BookingMessagePanel
                        viewerRole="DRIVER"
                        apiBasePath={`/api/driver/bookings/${offer.bookingId}/messages`}
                        title="Message Customer"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Assignment Offers History */}
        {pastOffers.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-lg font-semibold text-slate-300">
              Past Offer History ({pastOffers.length})
            </h2>
            <div className="space-y-3 animate-fade-in-up">
              {pastOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-200">{offer.pickupLocation.address}</p>
                    <p className="text-slate-400 mt-0.5">
                      Offered: {new Date(offer.offeredAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full font-medium ${
                      offer.status === 'ACCEPTED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : offer.status === 'REJECTED'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {offer.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reject Confirmation Modal */}
        {rejectModalId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-in">
              <h3 className="text-lg font-bold text-white">Reject Assignment Offer</h3>
              <p className="text-xs text-slate-300">
                Are you sure you want to decline this booking offer? The system will pass the
                request to the next available driver candidate.
              </p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Reason for Rejection (Optional)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Too far, vehicle issue"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalId(null)}
                  className="min-h-[48px] px-4 py-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-200 text-xs font-semibold rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={!!actioningId}
                  className="min-h-[48px] px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                >
                  {actioningId && (
                    <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                  )}
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </DriverLayout>
  );
}
