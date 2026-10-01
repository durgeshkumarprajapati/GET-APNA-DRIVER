'use client';

import { useState, useEffect } from 'react';
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
  taxesAndFees: number;
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

  useEffect(() => {
    if (!isOpen || !params) return;

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
            vehicleCategory: params!.vehicleCategory || 'SEDAN',
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
          vehicleCategoryCode: params.vehicleCategory || 'SEDAN',
          savedPersonId: params.savedPersonId,
          preferredDriverId: params.preferredDriverId,
          customerNotes: `One-Tap Rebooking (${params.title || 'Smart Rebook'})`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#181c24] border border-[#262a33] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in-up font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262a33] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#25a475]/20 border border-[#25a475] flex items-center justify-center text-[#68dba9]">
              <span className="material-symbols-outlined text-xl">bolt</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] leading-tight">
                Review &amp; Confirm 1-Tap Booking
              </h3>
              <p className="text-xs text-[#87948b]">
                {params.title || 'Instant Chauffeur Dispatch'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#87948b] hover:text-[#dfe2ee] p-1 rounded-lg hover:bg-[#262a33] transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[#93000a]/20 border border-[#93000a] text-[#ffb4ab] text-xs font-mono">
            {error}
          </div>
        )}

        {/* Service Locations Overview */}
        <div className="bg-[#0f131c] p-4 rounded-xl border border-[#262a33] space-y-3 font-mono text-xs">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[#68dba9] text-base shrink-0 mt-0.5">
              location_on
            </span>
            <div>
              <span className="text-[10px] text-[#87948b] uppercase tracking-wider block">
                Pickup Address
              </span>
              <span className="text-[#dfe2ee] font-bold">
                {params.pickupLocation.label ? `${params.pickupLocation.label} — ` : ''}
                {params.pickupLocation.address}
              </span>
            </div>
          </div>

          {params.dropoffLocation && (
            <div className="flex items-start gap-3 pt-2 border-t border-[#262a33]">
              <span className="material-symbols-outlined text-[#f5c04a] text-base shrink-0 mt-0.5">
                flag
              </span>
              <div>
                <span className="text-[10px] text-[#87948b] uppercase tracking-wider block">
                  Destination Address
                </span>
                <span className="text-[#dfe2ee] font-bold">
                  {params.dropoffLocation.label ? `${params.dropoffLocation.label} — ` : ''}
                  {params.dropoffLocation.address}
                </span>
              </div>
            </div>
          )}

          {/* Badges Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#262a33]">
            <span className="px-2.5 py-1 rounded-md bg-[#181c24] border border-[#262a33] text-[#68dba9] font-bold text-[11px]">
              {params.bookingType}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#181c24] border border-[#262a33] text-[#dfe2ee] font-bold text-[11px]">
              {params.vehicleCategory || 'SEDAN'}
            </span>
            {params.savedPersonName && (
              <span className="px-2.5 py-1 rounded-md bg-[#25a475]/20 border border-[#25a475] text-[#68dba9] font-bold text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">person</span>
                For: {params.savedPersonName}
              </span>
            )}
            {params.preferredDriverName && (
              <span className="px-2.5 py-1 rounded-md bg-[#3a2f00] border border-[#5c4a00] text-[#f5c04a] font-bold text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">star</span>
                Chauffeur: {params.preferredDriverName}
              </span>
            )}
          </div>
        </div>

        {/* Upfront Payment Breakdown */}
        {loading ? (
          <div className="p-6 text-center text-xs font-mono text-[#87948b] bg-[#0f131c] rounded-xl border border-[#262a33]">
            Calculating upfront fare breakdown...
          </div>
        ) : summary ? (
          <div className="bg-[#0f131c] p-4 rounded-xl border border-[#262a33] space-y-2.5 font-mono text-xs">
            <span className="text-[10px] text-[#87948b] uppercase tracking-wider block font-bold">
              Upfront Fare &amp; Payment Breakdown
            </span>

            <div className="flex justify-between text-[#bccac0]">
              <span>Base Service Fare</span>
              <span>{formatCurrency(summary.baseFare)}</span>
            </div>

            {summary.distanceFare > 0 && (
              <div className="flex justify-between text-[#bccac0]">
                <span>Distance Fare (~{summary.estimatedDistanceKm} km)</span>
                <span>{formatCurrency(summary.distanceFare)}</span>
              </div>
            )}

            {summary.durationFare > 0 && (
              <div className="flex justify-between text-[#bccac0]">
                <span>Duration Fare (~{summary.estimatedDurationMinutes} mins)</span>
                <span>{formatCurrency(summary.durationFare)}</span>
              </div>
            )}

            <div className="flex justify-between text-[#87948b]">
              <span>Taxes &amp; Fees (GST 18%)</span>
              <span>{formatCurrency(summary.taxesAndFees)}</span>
            </div>

            <div className="flex justify-between text-[#68dba9] font-bold text-sm pt-2 border-t border-[#262a33]">
              <span>Total Upfront Amount</span>
              <span>{formatCurrency(summary.totalFare)}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-3 border-t border-[#262a33] flex items-center justify-between">
              <span className="text-[#87948b]">Payment Mode:</span>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="bg-[#181c24] border border-[#262a33] text-[#dfe2ee] rounded-lg px-3 py-1 font-bold focus:outline-none focus:border-[#68dba9]"
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
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0f131c] hover:bg-[#262a33] border border-[#262a33] text-[#dfe2ee] text-xs font-bold font-mono transition-colors"
          >
            Customize Details →
          </button>

          <button
            type="button"
            onClick={handleConfirmOneTap}
            disabled={submitting || loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#68dba9] hover:bg-[#86e2ba] text-[#003825] font-bold font-['Space_Grotesk'] text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#68dba9]/20 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-[#003825] border-t-transparent rounded-full animate-spin" />
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
