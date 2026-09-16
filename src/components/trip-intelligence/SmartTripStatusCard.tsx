'use client';

import { useState } from 'react';
import type { TripIntelligenceResult } from '@/modules/trip-intelligence/trip-intelligence-types';
import { LocationMapModal } from '@/components/maps/location-map-modal';
import Link from 'next/link';

export interface SmartTripStatusCardProps {
  intelligence: TripIntelligenceResult;
  bookingId: string;
}

export function SmartTripStatusCard({ intelligence, bookingId }: SmartTripStatusCardProps) {
  const [mapOpen, setMapOpen] = useState(false);

  const mapAction = intelligence.actions.find((a) => a.type === 'SHOW_MAP');
  const invoiceAction = intelligence.actions.find((a) => a.type === 'OPEN_INVOICE');
  const reviewAction = intelligence.actions.find((a) => a.type === 'OPEN_REVIEW');
  const rewardAction = intelligence.actions.find((a) => a.type === 'OPEN_REWARD');
  const prefillAction = intelligence.actions.find((a) => a.type === 'PREFILL_BOOKING');

  const getFreshnessBadge = () => {
    switch (intelligence.freshness) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>LIVE
            LOCATION
          </span>
        );
      case 'RECENT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            RECENT ({intelligence.freshnessSeconds}s)
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            STALE UPDATE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            UNAVAILABLE
          </span>
        );
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Smart Trip Intelligence
          </span>
        </div>
        {getFreshnessBadge()}
      </div>

      {/* Main Title & Explanation */}
      <div>
        <h3 className="text-base font-bold text-slate-100">{intelligence.title}</h3>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{intelligence.explanation}</p>
      </div>

      {/* Map Action Button */}
      {mapAction && mapAction.type === 'SHOW_MAP' && (
        <>
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>📍 View Live Map & Driver Location</span>
          </button>

          {mapOpen && (
            <LocationMapModal
              open={mapOpen}
              onClose={() => setMapOpen(false)}
              title="Live Trip & Driver Location"
              center={{
                latitude: mapAction.payload.driverLatitude || mapAction.payload.pickupLatitude,
                longitude: mapAction.payload.driverLongitude || mapAction.payload.pickupLongitude,
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
                ...(mapAction.payload.driverLatitude && mapAction.payload.driverLongitude
                  ? [
                      {
                        id: 'driver',
                        position: {
                          latitude: mapAction.payload.driverLatitude,
                          longitude: mapAction.payload.driverLongitude,
                        },
                        type: 'DRIVER' as const,
                        title: 'Driver Location',
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </>
      )}

      {/* Post-Trip Intelligence Card */}
      {intelligence.signalType === 'TRIP_COMPLETED' && (
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-300">Post-Trip Summary & Rewards</div>
          <div className="grid grid-cols-2 gap-2">
            {invoiceAction && invoiceAction.type === 'OPEN_INVOICE' && (
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Final Fare</div>
                <div className="text-sm font-bold text-emerald-400">
                  ₹{invoiceAction.payload.finalFare}
                </div>
              </div>
            )}
            {rewardAction && rewardAction.type === 'OPEN_REWARD' && (
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  Points Earned
                </div>
                <div className="text-sm font-bold text-amber-400">
                  +{rewardAction.payload.earnedPoints} pts
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {reviewAction && (
              <Link
                href={`/customer/reviews/new?bookingId=${bookingId}`}
                className="flex-1 text-center py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Rate Driver
              </Link>
            )}
            {prefillAction && prefillAction.type === 'PREFILL_BOOKING' && (
              <Link
                href={`/bookings/new?pickup=${encodeURIComponent(prefillAction.payload.pickupAddress)}&dropoff=${encodeURIComponent(prefillAction.payload.dropoffAddress)}`}
                className="flex-1 text-center py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700"
              >
                Book Again
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      {intelligence.signalType !== 'TRIP_COMPLETED' && (
        <div className="flex gap-2 pt-2">
          <Link
            href="/support"
            className="flex-1 text-center py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700"
          >
            Contact Support
          </Link>
          <Link
            href="/customer/ai-assistant"
            className="flex-1 text-center py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            Ask AI Assistant
          </Link>
        </div>
      )}
    </div>
  );
}
