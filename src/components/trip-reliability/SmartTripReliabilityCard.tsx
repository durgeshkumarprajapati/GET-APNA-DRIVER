'use client';

import { useState } from 'react';
import type { CustomerReliabilityView } from '@/modules/trip-reliability/trip-reliability-types';
import { LocationMapModal } from '@/components/maps/location-map-modal';
import Link from 'next/link';

export interface SmartTripReliabilityCardProps {
  reliability: CustomerReliabilityView;
}

export function SmartTripReliabilityCard({ reliability }: SmartTripReliabilityCardProps) {
  const [mapOpen, setMapOpen] = useState(false);

  if (!reliability.hasActiveIncident && !reliability.lastKnownLocation) {
    return null;
  }

  return (
    <div
      className={`p-4 rounded-2xl border shadow-lg space-y-3 ${
        reliability.severity === 'CRITICAL' || reliability.severity === 'HIGH'
          ? 'bg-rose-950/40 border-rose-800/60 text-rose-100'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              reliability.hasActiveIncident ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          ></span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Trip Reliability Monitor
          </span>
        </div>
        {reliability.severity && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              reliability.severity === 'CRITICAL'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {reliability.severity} SEVERITY
          </span>
        )}
      </div>

      {/* Title & Explanation */}
      <div>
        <h3 className="text-sm font-bold text-slate-100">{reliability.statusTitle}</h3>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          {reliability.statusExplanation}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {reliability.recommendedAction?.type === 'CALL_DRIVER' && (
          <Link
            href="/support"
            className="flex-1 text-center py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
          >
            Call Driver
          </Link>
        )}

        {reliability.recommendedAction?.type === 'VIEW_MAP' && (
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700"
          >
            📍 {reliability.recommendedAction.label || 'View Map'}
          </button>
        )}

        <Link
          href="/support"
          className="flex-1 text-center py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700"
        >
          Contact Support
        </Link>
      </div>

      {/* Map Modal Trigger */}
      {mapOpen && reliability.lastKnownLocation && (
        <LocationMapModal
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          title="Driver Last Known Location"
          center={{
            latitude: reliability.lastKnownLocation.latitude,
            longitude: reliability.lastKnownLocation.longitude,
          }}
          markers={[
            {
              id: 'last_known',
              position: {
                latitude: reliability.lastKnownLocation.latitude,
                longitude: reliability.lastKnownLocation.longitude,
              },
              type: 'DRIVER',
              title: 'Last Known Location',
            },
          ]}
        />
      )}
    </div>
  );
}
