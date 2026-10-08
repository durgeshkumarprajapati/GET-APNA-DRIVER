'use client';

import type { BookingLocationIntelligence } from '@/modules/location-intelligence/application/location-intelligence-service';

interface LocationETACardProps {
  locationIntelligence: Partial<BookingLocationIntelligence>;
  variant?: 'customer' | 'driver' | 'admin';
}

export function LocationETACard({
  locationIntelligence,
  variant = 'customer',
}: LocationETACardProps) {
  const {
    etaToPickup,
    etaToDestination,
    distances,
    freshness = 'UNAVAILABLE',
    locationConfidence,
    pickupProximity,
    pickupZone,
  } = locationIntelligence;

  const activeETA = etaToPickup || etaToDestination;

  const freshnessColor =
    freshness === 'LIVE'
      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
      : freshness === 'RECENT'
        ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
        : 'bg-rose-950/60 border-rose-500/50 text-rose-300';

  const confidenceColor =
    locationConfidence?.level === 'HIGH'
      ? 'text-emerald-400'
      : locationConfidence?.level === 'MEDIUM'
        ? 'text-amber-400'
        : 'text-rose-400';

  return (
    <div className="p-5 rounded-2xl bg-surface-container border border-border shadow-xl space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <span className="material-symbols-outlined text-lg">near_me</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
              Location Intelligence & ETA
            </h3>
            <p className="text-[11px] text-on-surface-variant font-mono">
              {activeETA?.provider
                ? `Routing Provider: ${activeETA.provider}`
                : 'Multi-provider Routing'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${freshnessColor}`}
          >
            {freshness} TELEMETRY
          </span>
          {locationConfidence && (
            <span className={`text-[11px] font-mono font-bold ${confidenceColor}`}>
              ● {locationConfidence.level} CONFIDENCE
            </span>
          )}
        </div>
      </div>

      {/* ETA METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-surface-container-high border border-border space-y-1">
          <span className="text-[10px] uppercase text-on-surface-variant block">Estimated Arrival</span>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-['Space_Grotesk']">
            {activeETA ? `~${activeETA.durationMinutes} mins` : 'Calculating…'}
          </div>
          <span className="text-[10px] text-on-surface-variant">
            {activeETA?.isEstimate ? 'Calculated estimate' : 'Live route ETA'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-high border border-border space-y-1">
          <span className="text-[10px] uppercase text-on-surface-variant block">Distance to Pickup</span>
          <div className="text-lg font-bold text-on-surface font-['Space_Grotesk']">
            {distances?.driverToPickupKmDisplay ||
              (pickupProximity?.distanceMeters !== undefined &&
              pickupProximity.distanceMeters !== 999999
                ? `${(pickupProximity.distanceMeters / 1000).toFixed(1)} km`
                : '—')}
          </div>
          <span className="text-[10px] text-on-surface-variant">
            {pickupProximity?.signal === 'DRIVER_AT_PICKUP'
              ? 'Arrived at pickup point'
              : pickupProximity?.isNearPickup
                ? 'Within 500m pickup zone'
                : 'Driver en route'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-high border border-border space-y-1">
          <span className="text-[10px] uppercase text-on-surface-variant block">Pickup Zone</span>
          <div className="text-sm font-bold text-on-surface truncate">
            {pickupZone?.zone?.name || 'Urban Zone'}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{pickupZone?.zone?.code || 'GENERAL'}</span>
        </div>
      </div>

      {variant === 'driver' && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">directions</span>
          <span>Guidance: Driver distance validated by server location telemetry.</span>
        </div>
      )}
    </div>
  );
}
