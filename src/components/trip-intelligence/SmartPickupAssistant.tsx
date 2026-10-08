'use client';

import { useState } from 'react';
import type { TripIntelligenceResult } from '@/modules/trip-intelligence/trip-intelligence-types';
import { LocationMapModal } from '@/components/maps/location-map-modal';
import Link from 'next/link';

export interface SmartPickupAssistantProps {
  intelligence: TripIntelligenceResult;
  bookingId: string;
}

export function SmartPickupAssistant({ intelligence }: SmartPickupAssistantProps) {
  const [mapOpen, setMapOpen] = useState(false);

  const mapAction = intelligence.actions.find((a) => a.type === 'SHOW_MAP');
  const incentiveAction = intelligence.actions.find((a) => a.type === 'SHOW_INCENTIVE');

  return (
    <div className="p-5 rounded-2xl bg-surface-container border border-border space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Smart Pickup Assistant
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          {intelligence.freshness}
        </span>
      </div>

      {/* Main Title & Explanation */}
      <div>
        <h3 className="text-base font-bold text-on-surface">{intelligence.title}</h3>
        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{intelligence.explanation}</p>
      </div>

      {/* Map Action Button */}
      {mapAction && mapAction.type === 'SHOW_MAP' && (
        <>
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs border border-border transition-colors flex items-center justify-center gap-2"
          >
            <span>🗺️ View Pickup Location Map</span>
          </button>

          {mapOpen && (
            <LocationMapModal
              open={mapOpen}
              onClose={() => setMapOpen(false)}
              title="Customer Pickup Location"
              center={{
                latitude: mapAction.payload.pickupLatitude,
                longitude: mapAction.payload.pickupLongitude,
              }}
              markers={[
                {
                  id: 'pickup',
                  position: {
                    latitude: mapAction.payload.pickupLatitude,
                    longitude: mapAction.payload.pickupLongitude,
                  },
                  type: 'PICKUP',
                  title: 'Pickup Location',
                },
              ]}
            />
          )}
        </>
      )}

      {/* Post-Trip Completion Driver Card */}
      {intelligence.signalType === 'TRIP_COMPLETED' &&
        incentiveAction &&
        incentiveAction.type === 'SHOW_INCENTIVE' && (
          <div className="pt-3 border-t border-border space-y-2">
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">Incentive Target Progress</div>
            <div className="flex justify-between items-center text-xs text-on-surface-variant">
              <span>
                Completed Rides: {incentiveAction.payload.completedRides} /{' '}
                {incentiveAction.payload.targetRides}
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +₹{incentiveAction.payload.bonusAmount} Bonus
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full"
                style={{
                  width: `${Math.min(100, (incentiveAction.payload.completedRides / incentiveAction.payload.targetRides) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        <Link
          href="/support"
          className="flex-1 text-center py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium text-xs border border-border"
        >
          Support
        </Link>
        <Link
          href="/driver/ai-assistant"
          className="flex-1 text-center py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
        >
          Copilot Assistant
        </Link>
      </div>
    </div>
  );
}
