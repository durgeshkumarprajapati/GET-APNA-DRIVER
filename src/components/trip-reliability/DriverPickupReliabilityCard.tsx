'use client';

import { useState } from 'react';
import type { DriverReliabilityView } from '@/modules/trip-reliability/trip-reliability-types';
import { LocationMapModal } from '@/components/maps/location-map-modal';
import { useTranslation } from '@/i18n/context';
import Link from 'next/link';

export interface DriverPickupReliabilityCardProps {
  reliability: DriverReliabilityView;
  /** Called after a confirmation response is successfully recorded, so the parent can refetch the reliability view. */
  onConfirmed?: () => void;
}

type DriverConfirmationResponseValue =
  'STILL_TRAVELLING' | 'ARRIVED' | 'TEMPORARILY_DELAYED' | 'UNABLE_TO_CONTINUE';

export function DriverPickupReliabilityCard({
  reliability,
  onConfirmed,
}: DriverPickupReliabilityCardProps) {
  const { t } = useTranslation();
  const [mapOpen, setMapOpen] = useState(false);
  const [submittingResponse, setSubmittingResponse] =
    useState<DriverConfirmationResponseValue | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  if (!reliability.hasActiveIncident) {
    return null;
  }

  const handleConfirm = async (response: DriverConfirmationResponseValue) => {
    if (!reliability.incidentId || submittingResponse) return;
    setSubmittingResponse(response);
    setFeedback(null);
    try {
      const res = await fetch(`/api/driver/bookings/${reliability.bookingId}/reliability/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: reliability.incidentId, response }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to send update');
      }
      setFeedback({ tone: 'success', text: t('driver.tripReliability.confirmSubmitted') });
      onConfirmed?.();
    } catch {
      setFeedback({ tone: 'error', text: t('driver.tripReliability.confirmFailed') });
    } finally {
      setSubmittingResponse(null);
    }
  };

  const hasCoords = Boolean(
    reliability.recommendedAction?.payload &&
    typeof reliability.recommendedAction.payload === 'object' &&
    'latitude' in reliability.recommendedAction.payload,
  );

  const latitude = hasCoords
    ? Number((reliability.recommendedAction?.payload as Record<string, unknown>).latitude)
    : 0;
  const longitude = hasCoords
    ? Number((reliability.recommendedAction?.payload as Record<string, unknown>).longitude)
    : 0;

  return (
    <div className="p-4 rounded-2xl bg-surface-container border border-border space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Pickup Reliability Notice
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-on-surface">{reliability.statusTitle}</h3>
        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
          {reliability.statusExplanation}
        </p>
      </div>

      {reliability.incidentId && (
        <div className="p-3 rounded-xl bg-surface-container-high border border-border space-y-2">
          <span className="text-xs font-bold text-on-surface">
            {t('driver.tripReliability.confirmPromptTitle')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['STILL_TRAVELLING', 'driver.tripReliability.confirmStillTravelling'],
                ['ARRIVED', 'driver.tripReliability.confirmArrived'],
                ['TEMPORARILY_DELAYED', 'driver.tripReliability.confirmDelayed'],
                ['UNABLE_TO_CONTINUE', 'driver.tripReliability.confirmUnableToContinue'],
              ] as const
            ).map(([value, labelKey]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleConfirm(value)}
                disabled={submittingResponse !== null}
                className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  value === 'UNABLE_TO_CONTINUE'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20'
                    : 'bg-surface-container-highest border-border text-on-surface hover:bg-surface-container'
                }`}
              >
                {submittingResponse === value
                  ? t('driver.tripReliability.confirmSubmitting')
                  : t(labelKey)}
              </button>
            ))}
          </div>
          {feedback && (
            <p
              role={feedback.tone === 'error' ? 'alert' : 'status'}
              className={`text-[11px] ${feedback.tone === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}
            >
              {feedback.text}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {hasCoords && (
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="flex-1 py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs border border-border"
          >
            🗺️ View Pickup Location
          </button>
        )}
        <Link
          href="/support"
          className="flex-1 text-center py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium text-xs border border-border"
        >
          Support
        </Link>
      </div>

      {mapOpen && hasCoords && (
        <LocationMapModal
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          title="Customer Pickup Location"
          center={{ latitude, longitude }}
          markers={[
            {
              id: 'pickup',
              position: { latitude, longitude },
              type: 'PICKUP',
              title: 'Customer Pickup Location',
            },
          ]}
        />
      )}
    </div>
  );
}
