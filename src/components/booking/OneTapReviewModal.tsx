'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/context';

export interface LocationDetail {
  address: string;
  label?: string | null;
  latitude: number;
  longitude: number;
}

export interface OneTapReviewParams {
  pickupLocation: LocationDetail;
  dropoffLocation?: LocationDetail | null;
  bookingType: string;
  vehicleCategory?: string;
  savedPersonId?: string | null;
  savedPersonName?: string | null;
  preferredDriverId?: string | null;
  preferredDriverName?: string | null;
  title?: string;
}

interface UpfrontSummary {
  baseFare: number;
  distanceFare: number;
  durationFare: number;
  platformFee: number;
  totalFare: number;
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  paymentMethod: string;
  serviceRecipient: {
    fullName: string;
    phone?: string | null;
    isForSomeoneElse: boolean;
  };
  preferredDriver?: {
    id: string;
    displayName: string;
  } | null;
}

interface OneTapReviewModalProps {
  params: OneTapReviewParams | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OneTapReviewModal({ params, isOpen, onClose }: OneTapReviewModalProps) {
  const router = useRouter();
  const { formatCurrency } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<UpfrontSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  // Generated once per review session (not per submit attempt) so retrying
  // after an error reuses the same key — createBooking recognizes it and
  // returns the already-created booking instead of creating a duplicate.
  // A ref rather than state: nothing needs to re-render when it's set, and
  // mutating a ref inside an effect (unlike calling a state setter) isn't
  // subject to React's set-state-in-effect restriction.
  const idempotencyKeyRef = useRef<string>('');

  useEffect(() => {
    if (!isOpen || !params) return;
    idempotencyKeyRef.current = crypto.randomUUID();

    let active = true;
    async function fetchEstimate() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/customer/smart-rebooking/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pickupLocation: params!.pickupLocation,
            dropoffLocation: params!.dropoffLocation,
            bookingType: params!.bookingType,
            vehicleCategory: params!.vehicleCategory || 'CAR',
            savedPersonId: params!.savedPersonId,
            preferredDriverId: params!.preferredDriverId,
          }),
        });

        if (!res.ok) throw new Error('Failed to compute upfront fare summary');
        const data = await res.json();
        if (active && data.success) {
          setSummary(data.upfrontSummary.paymentSummary);
          if (data.upfrontSummary.paymentSummary.paymentMethod) {
            setPaymentMode(data.upfrontSummary.paymentSummary.paymentMethod);
          }
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error calculating estimate');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchEstimate();
    return () => {
      active = false;
    };
  }, [isOpen, params]);

  if (!isOpen || !params) return null;

  const handleConfirmOneTap = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/customer/smart-rebooking/one-tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupLocation: params.pickupLocation,
          dropoffLocation: params.dropoffLocation,
          bookingType: params.bookingType,
          vehicleCategoryCode: params.vehicleCategory || 'CAR',
          savedPersonId: params.savedPersonId,
          preferredDriverId: params.preferredDriverId,
          customerNotes: `One-Tap Rebooking (${params.title || 'Smart Rebook'})`,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to place one-tap booking');
      }

      onClose();
      router.push(`/bookings/${data.booking.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm one-tap booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomize = () => {
    const query = new URLSearchParams();
    if (params.pickupLocation) {
      query.set('pickupAddress', params.pickupLocation.address);
      query.set('pickupLat', String(params.pickupLocation.latitude));
      query.set('pickupLng', String(params.pickupLocation.longitude));
    }
    if (params.dropoffLocation) {
      query.set('dropoffAddress', params.dropoffLocation.address);
      query.set('dropoffLat', String(params.dropoffLocation.latitude));
      query.set('dropoffLng', String(params.dropoffLocation.longitude));
    }
    if (params.bookingType) query.set('type', params.bookingType);
    if (params.savedPersonId) query.set('savedPersonId', params.savedPersonId);
    if (params.preferredDriverId) query.set('preferredDriverId', params.preferredDriverId);

    onClose();
    router.push(`/bookings/new?${query.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-surface-container border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in-up font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">bolt</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface font-['Space_Grotesk'] leading-tight">
                Review &amp; Confirm 1-Tap Booking
              </h3>
              <p className="text-xs text-on-surface-variant">
                {params.title || 'Instant Chauffeur Dispatch'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono">
            {error}
          </div>
        )}

        {/* Service Locations Overview */}
        <div className="bg-surface-container-high p-4 rounded-xl border border-border space-y-3 font-mono text-xs">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">
              location_on
            </span>
            <div>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">
                Pickup Address
              </span>
              <span className="text-on-surface font-bold">
                {params.pickupLocation.label ? `${params.pickupLocation.label} — ` : ''}
                {params.pickupLocation.address}
              </span>
            </div>
          </div>

          {params.dropoffLocation && (
            <div className="flex items-start gap-3 pt-2 border-t border-border">
              <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">
                flag
              </span>
              <div>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">
                  Destination Address
                </span>
                <span className="text-on-surface font-bold">
                  {params.dropoffLocation.label ? `${params.dropoffLocation.label} — ` : ''}
                  {params.dropoffLocation.address}
                </span>
              </div>
            </div>
          )}

          {/* Badges Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <span className="px-2.5 py-1 rounded-md bg-surface-container border border-border text-primary font-bold text-[11px]">
              {params.bookingType}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-surface-container border border-border text-on-surface font-bold text-[11px]">
              {params.vehicleCategory || 'CAR'}
            </span>
            {params.savedPersonName && (
              <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary font-bold text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">person</span>
                For: {params.savedPersonName}
              </span>
            )}
            {params.preferredDriverName && (
              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">star</span>
                Chauffeur: {params.preferredDriverName}
              </span>
            )}
          </div>
        </div>

        {/* Upfront Payment Breakdown */}
        {loading ? (
          <div className="p-6 text-center text-xs font-mono text-on-surface-variant bg-surface-container-high rounded-xl border border-border">
            Calculating upfront fare breakdown...
          </div>
        ) : summary ? (
          <div className="bg-surface-container-high p-4 rounded-xl border border-border space-y-2.5 font-mono text-xs">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">
              Upfront Fare &amp; Payment Breakdown
            </span>

            <div className="flex justify-between text-on-surface-variant">
              <span>Base Service Fare</span>
              <span>{formatCurrency(summary.baseFare)}</span>
            </div>

            {summary.distanceFare > 0 && (
              <div className="flex justify-between text-on-surface-variant">
                <span>Distance Fare (~{summary.estimatedDistanceKm} km)</span>
                <span>{formatCurrency(summary.distanceFare)}</span>
              </div>
            )}

            {summary.durationFare > 0 && (
              <div className="flex justify-between text-on-surface-variant">
                <span>Duration Fare (~{summary.estimatedDurationMinutes} mins)</span>
                <span>{formatCurrency(summary.durationFare)}</span>
              </div>
            )}

            <div className="flex justify-between text-on-surface-variant">
              <span>Platform Fee</span>
              <span>{formatCurrency(summary.platformFee)}</span>
            </div>

            <div className="flex justify-between text-primary font-bold text-sm pt-2 border-t border-border">
              <span>Total Upfront Amount</span>
              <span>{formatCurrency(summary.totalFare)}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-on-surface-variant">Payment Mode:</span>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="bg-surface-container border border-border text-on-surface rounded-lg px-3 py-1 font-bold focus:outline-none focus:border-primary"
              >
                <option value="CASH">Cash to Driver</option>
                <option value="UPI">UPI / Instant Pay</option>
                <option value="WALLET">Apna Wallet</option>
                <option value="CARD">Credit/Debit Card</option>
              </select>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleCustomize}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border text-on-surface text-xs font-bold font-mono transition-colors"
          >
            Customize Details →
          </button>

          <button
            type="button"
            onClick={handleConfirmOneTap}
            disabled={submitting || loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 text-on-primary font-bold font-['Space_Grotesk'] text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                Dispatching Driver...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">bolt</span>
                Confirm &amp; Dispatch Driver Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
