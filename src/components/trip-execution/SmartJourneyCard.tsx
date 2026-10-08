'use client';

import React from 'react';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import type {
  CustomerJourneyDTO,
  DriverJourneyDTO,
  AdminJourneyDTO,
} from '@/modules/trip-execution/application/journey-orchestration-service';

interface SmartJourneyCardProps {
  journey: CustomerJourneyDTO | DriverJourneyDTO | AdminJourneyDTO;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  onCallDriver?: () => void;
  onCallCustomer?: () => void;
  onVerifyPinClick?: () => void;
}

const DERIVED_STATE_TONES: Record<string, StatusBadgeTone> = {
  SEARCHING_DRIVER: 'warning',
  DRIVER_ASSIGNED: 'info',
  DRIVER_EN_ROUTE: 'info',
  DRIVER_NEAR_PICKUP: 'warning',
  DRIVER_ARRIVED: 'success',
  READY_TO_START: 'success',
  TRIP_IN_PROGRESS: 'success',
  TRIP_DELAY_RISK: 'danger',
  DESTINATION_NEAR: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

const DERIVED_STATE_LABELS: Record<string, string> = {
  SEARCHING_DRIVER: 'Finding Driver…',
  DRIVER_ASSIGNED: 'Driver Assigned',
  DRIVER_EN_ROUTE: 'Driver En Route to Pickup',
  DRIVER_NEAR_PICKUP: 'Driver Near Pickup (<500m)',
  DRIVER_ARRIVED: 'Driver Arrived at Pickup',
  READY_TO_START: 'Ready to Start Trip (PIN Required)',
  TRIP_IN_PROGRESS: 'Trip in Progress',
  TRIP_DELAY_RISK: 'Potential Delay Risk Detected',
  DESTINATION_NEAR: 'Approaching Destination (<1km)',
  COMPLETED: 'Trip Completed',
  CANCELLED: 'Trip Cancelled',
};

export const SmartJourneyCard: React.FC<SmartJourneyCardProps> = ({
  journey,
  role,
  onCallDriver,
  onCallCustomer,
  onVerifyPinClick,
}) => {
  const tone = DERIVED_STATE_TONES[journey.derivedState] ?? 'info';
  const label = DERIVED_STATE_LABELS[journey.derivedState] ?? journey.derivedState;

  const customerJourney = role === 'CUSTOMER' ? (journey as CustomerJourneyDTO) : null;
  const driverJourney = role === 'DRIVER' ? (journey as DriverJourneyDTO) : null;
  const adminJourney = role === 'ADMIN' ? (journey as AdminJourneyDTO) : null;

  return (
    <div className="p-5 rounded-2xl bg-surface-container border border-border space-y-4 shadow-lg text-on-surface">
      {/* Header & Status */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">near_me</span>
          <span className="font-bold text-sm tracking-wide uppercase text-on-surface-variant">
            Journey Execution 2.0
          </span>
        </div>
        <StatusBadge label={label} tone={tone} />
      </div>

      {/* ETA & Freshness Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-container-high border border-border text-xs">
        <div>
          <span className="block text-[10px] uppercase text-on-surface-variant font-bold">
            Estimated Arrival / ETA
          </span>
          <span className="text-sm font-bold text-primary">
            {journey.eta.isStale ? (
              <span className="text-error">Location updating…</span>
            ) : (
              (journey.eta.displayETA ?? 'Calculating…')
            )}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase text-on-surface-variant font-bold">
            Location Freshness
          </span>
          <span className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                journey.locationFreshness === 'LIVE'
                  ? 'bg-primary animate-pulse'
                  : journey.locationFreshness === 'RECENT'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
              }`}
            />
            <span className="font-semibold text-xs text-on-surface">
              {journey.locationFreshness}
            </span>
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase text-on-surface-variant font-bold">
            Pickup Proximity
          </span>
          <span className="font-medium text-xs text-on-surface">
            {journey.pickupProximity.distanceKmDisplay
              ? `${journey.pickupProximity.distanceKmDisplay} away`
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* Customer-only Secure Ride PIN Card */}
      {customerJourney && customerJourney.ridePin && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/40 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-base">pin</span>
              <span>Your Secure Ride PIN</span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Share this 6-digit PIN with your driver to start the trip securely.
            </p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-surface-container-highest border border-primary text-xl font-mono font-extrabold tracking-widest text-primary">
            {customerJourney.ridePin}
          </div>
        </div>
      )}

      {/* Driver-only Ride PIN Verification Control */}
      {driverJourney && (
        <div className="p-4 rounded-xl bg-surface-container-high border border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Ride PIN Status
            </span>
            <p className="text-xs mt-0.5 text-on-surface">
              {driverJourney.ridePinVerification.verified ? (
                <span className="text-primary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  PIN Verified
                </span>
              ) : (
                <span className="text-amber-500 font-semibold">PIN Verification Pending</span>
              )}
            </p>
          </div>
          {!driverJourney.ridePinVerification.verified && onVerifyPinClick && (
            <button
              type="button"
              onClick={onVerifyPinClick}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-colors"
            >
              Verify PIN & Start Trip
            </button>
          )}
        </div>
      )}

      {/* Flexible Driver Hire Status Card */}
      {journey.destinationProximity.isFlexibleHire && (
        <div className="p-3.5 rounded-xl bg-surface-container-high border border-border text-xs space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant text-[10px] font-bold uppercase">
            <span>Flexible Driver Hire Package</span>
            <span className="text-primary">Active Hire</span>
          </div>
          <p className="text-xs text-on-surface">
            Hire Duration:{' '}
            <strong className="text-primary">
              {journey.destinationProximity.hireDurationMinutes
                ? `${Math.round(journey.destinationProximity.hireDurationMinutes / 60)} Hours`
                : 'Flexible'}
            </strong>
            {journey.destinationProximity.hireTimeRemainingMinutes !== null && (
              <span className="ml-2 text-on-surface-variant">
                ({journey.destinationProximity.hireTimeRemainingMinutes} min remaining)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Driver / Customer Profile Info */}
      {customerJourney && customerJourney.driver && (
        <div className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold text-sm">
              {customerJourney.driver.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">{customerJourney.driver.fullName}</p>
              <p className="text-[11px] text-on-surface-variant">
                ⭐ {customerJourney.driver.rating.toFixed(1)} • {customerJourney.driver.totalTrips}{' '}
                Trips
                {customerJourney.driver.vehicleModel
                  ? ` • ${customerJourney.driver.vehicleModel}`
                  : ''}
              </p>
            </div>
          </div>

          {onCallDriver && (
            <button
              type="button"
              onClick={onCallDriver}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-container-lowest text-primary border border-primary/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Call Driver
            </button>
          )}
        </div>
      )}

      {driverJourney && (
        <div className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase">Customer</p>
            <p className="text-sm font-bold text-on-surface">{driverJourney.customer.fullName}</p>
            {driverJourney.customer.notes && (
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Notes: {driverJourney.customer.notes}
              </p>
            )}
          </div>

          {onCallCustomer && (
            <button
              type="button"
              onClick={onCallCustomer}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-container-lowest text-primary border border-primary/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Call Customer
            </button>
          )}
        </div>
      )}

      {adminJourney && (
        <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-on-surface-variant font-bold uppercase text-[10px]">Customer Name</p>
            <p className="text-on-surface font-semibold">{adminJourney.customerName}</p>
          </div>
          <div>
            <p className="text-on-surface-variant font-bold uppercase text-[10px]">Assigned Driver</p>
            <p className="text-on-surface font-semibold">
              {adminJourney.driverName ?? 'Unassigned'}
            </p>
          </div>
        </div>
      )}

      {/* Journey Timeline */}
      <div className="pt-3 border-t border-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Journey Timeline
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[10px]">
          {journey.timeline.map((step) => (
            <div
              key={step.key}
              className={`p-2 rounded-lg border ${
                step.status === 'COMPLETED'
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : step.status === 'IN_PROGRESS'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
                    : 'bg-surface-container-high border-border text-on-surface-variant'
              }`}
            >
              <span className="block font-bold truncate">{step.key.replace(/_/g, ' ')}</span>
              <span className="block text-[9px] mt-0.5 opacity-80">
                {step.timestamp
                  ? new Date(step.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
