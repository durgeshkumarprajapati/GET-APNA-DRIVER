'use client';

import React from 'react';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import type { CustomerJourneyDTO, DriverJourneyDTO, AdminJourneyDTO } from '@/modules/trip-execution/application/journey-orchestration-service';

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
    <div className="p-5 rounded-2xl bg-[#181c24] border border-[#262a33] space-y-4 shadow-lg text-[#dfe2ee]">
      {/* Header & Status */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#262a33]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#68dba9] text-xl">near_me</span>
          <span className="font-bold text-sm tracking-wide uppercase text-[#a2abb3]">Journey Execution 2.0</span>
        </div>
        <StatusBadge label={label} tone={tone} />
      </div>

      {/* ETA & Freshness Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#11141a] border border-[#262a33] text-xs">
        <div>
          <span className="block text-[10px] uppercase text-[#87948b] font-bold">Estimated Arrival / ETA</span>
          <span className="text-sm font-bold text-[#68dba9]">
            {journey.eta.isStale ? (
              <span className="text-[#ffb4ab]">Location updating…</span>
            ) : (
              journey.eta.displayETA ?? 'Calculating…'
            )}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase text-[#87948b] font-bold">Location Freshness</span>
          <span className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                journey.locationFreshness === 'LIVE'
                  ? 'bg-[#68dba9] animate-pulse'
                  : journey.locationFreshness === 'RECENT'
                  ? 'bg-[#e2c46c]'
                  : 'bg-[#ff897d]'
              }`}
            />
            <span className="font-semibold text-xs text-[#c0c7d4]">{journey.locationFreshness}</span>
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase text-[#87948b] font-bold">Pickup Proximity</span>
          <span className="font-medium text-xs text-[#c0c7d4]">
            {journey.pickupProximity.distanceKmDisplay ? `${journey.pickupProximity.distanceKmDisplay} away` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Customer-only Secure Ride PIN Card */}
      {customerJourney && customerJourney.ridePin && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#25a475]/15 to-[#004b32]/20 border border-[#25a475]/40 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#68dba9] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-base">pin</span>
              <span>Your Secure Ride PIN</span>
            </div>
            <p className="text-[11px] text-[#a2abb3] mt-0.5">
              Share this 6-digit PIN with your driver to start the trip securely.
            </p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-[#0d1117] border border-[#68dba9] text-xl font-mono font-extrabold tracking-widest text-[#68dba9]">
            {customerJourney.ridePin}
          </div>
        </div>
      )}

      {/* Driver-only Ride PIN Verification Control */}
      {driverJourney && (
        <div className="p-4 rounded-xl bg-[#11141a] border border-[#262a33] flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#a2abb3]">Ride PIN Status</span>
            <p className="text-xs mt-0.5 text-[#dfe2ee]">
              {driverJourney.ridePinVerification.verified ? (
                <span className="text-[#68dba9] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  PIN Verified
                </span>
              ) : (
                <span className="text-[#e2c46c]">PIN Verification Pending</span>
              )}
            </p>
          </div>
          {!driverJourney.ridePinVerification.verified && onVerifyPinClick && (
            <button
              type="button"
              onClick={onVerifyPinClick}
              className="px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] text-xs font-bold transition-colors"
            >
              Verify PIN & Start Trip
            </button>
          )}
        </div>
      )}

      {/* Flexible Driver Hire Status Card */}
      {journey.destinationProximity.isFlexibleHire && (
        <div className="p-3.5 rounded-xl bg-[#11141a] border border-[#262a33] text-xs space-y-1">
          <div className="flex items-center justify-between text-[#87948b] text-[10px] font-bold uppercase">
            <span>Flexible Driver Hire Package</span>
            <span className="text-[#68dba9]">Active Hire</span>
          </div>
          <p className="text-xs text-[#dfe2ee]">
            Hire Duration:{' '}
            <strong className="text-[#68dba9]">
              {journey.destinationProximity.hireDurationMinutes
                ? `${Math.round(journey.destinationProximity.hireDurationMinutes / 60)} Hours`
                : 'Flexible'}
            </strong>
            {journey.destinationProximity.hireTimeRemainingMinutes !== null && (
              <span className="ml-2 text-[#c0c7d4]">
                ({journey.destinationProximity.hireTimeRemainingMinutes} min remaining)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Driver / Customer Profile Info */}
      {customerJourney && customerJourney.driver && (
        <div className="pt-2 border-t border-[#262a33] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center text-[#68dba9] font-bold text-sm">
              {customerJourney.driver.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-[#dfe2ee]">{customerJourney.driver.fullName}</p>
              <p className="text-[11px] text-[#87948b]">
                ⭐ {customerJourney.driver.rating.toFixed(1)} • {customerJourney.driver.totalTrips} Trips
                {customerJourney.driver.vehicleModel ? ` • ${customerJourney.driver.vehicleModel}` : ''}
              </p>
            </div>
          </div>

          {onCallDriver && (
            <button
              type="button"
              onClick={onCallDriver}
              className="px-3.5 py-1.5 rounded-lg bg-[#262a33] hover:bg-[#323742] text-[#68dba9] border border-[#68dba9]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Call Driver
            </button>
          )}
        </div>
      )}

      {driverJourney && (
        <div className="pt-2 border-t border-[#262a33] flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-[#87948b] font-bold uppercase">Customer</p>
            <p className="text-sm font-bold text-[#dfe2ee]">{driverJourney.customer.fullName}</p>
            {driverJourney.customer.notes && (
              <p className="text-[11px] text-[#a2abb3] mt-0.5">Notes: {driverJourney.customer.notes}</p>
            )}
          </div>

          {onCallCustomer && (
            <button
              type="button"
              onClick={onCallCustomer}
              className="px-3.5 py-1.5 rounded-lg bg-[#262a33] hover:bg-[#323742] text-[#68dba9] border border-[#68dba9]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Call Customer
            </button>
          )}
        </div>
      )}

      {adminJourney && (
        <div className="pt-2 border-t border-[#262a33] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[#87948b] font-bold uppercase text-[10px]">Customer Name</p>
            <p className="text-[#dfe2ee] font-semibold">{adminJourney.customerName}</p>
          </div>
          <div>
            <p className="text-[#87948b] font-bold uppercase text-[10px]">Assigned Driver</p>
            <p className="text-[#dfe2ee] font-semibold">{adminJourney.driverName ?? 'Unassigned'}</p>
          </div>
        </div>
      )}

      {/* Journey Timeline */}
      <div className="pt-3 border-t border-[#262a33]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#87948b] mb-2">Journey Timeline</p>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[10px]">
          {journey.timeline.map((step) => (
            <div
              key={step.key}
              className={`p-2 rounded-lg border ${
                step.status === 'COMPLETED'
                  ? 'bg-[#25a475]/10 border-[#25a475]/40 text-[#68dba9]'
                  : step.status === 'IN_PROGRESS'
                  ? 'bg-[#e2c46c]/10 border-[#e2c46c]/40 text-[#e2c46c]'
                  : 'bg-[#11141a] border-[#262a33] text-[#6c757d]'
              }`}
            >
              <span className="block font-bold truncate">{step.key.replace(/_/g, ' ')}</span>
              <span className="block text-[9px] mt-0.5 opacity-80">
                {step.timestamp ? new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
