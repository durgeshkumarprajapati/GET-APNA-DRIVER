'use client';

import { useState } from 'react';
import type { DriverReliabilityView } from '@/modules/trip-reliability/trip-reliability-types';
import { LocationMapModal } from '@/components/maps/location-map-modal';
import Link from 'next/link';

export interface DriverPickupReliabilityCardProps {
  reliability: DriverReliabilityView;
}

export function DriverPickupReliabilityCard({ reliability }: DriverPickupReliabilityCardProps) {
  const [mapOpen, setMapOpen] = useState(false);

  if (!reliability.hasActiveIncident) {
    return null;
  }

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
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pickup Reliability Notice
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-100">{reliability.statusTitle}</h3>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          {reliability.statusExplanation}
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        {hasCoords && (
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700"
          >
            🗺️ View Pickup Location
          </button>
        )}
        <Link
          href="/support"
          className="flex-1 text-center py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700"
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
