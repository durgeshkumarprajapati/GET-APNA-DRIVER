'use client';

import { useState } from 'react';
import type { AIAssistantAction } from '@/modules/ai/ai-types';
import { LocationMapModal } from '@/components/maps/location-map-modal';
import Link from 'next/link';

export interface AIActionCardProps {
  action: AIAssistantAction;
  onConfirmAction?: (action: AIAssistantAction) => void;
}

export function AIActionCard({ action }: AIActionCardProps) {
  const [mapOpen, setMapOpen] = useState(false);

  switch (action.type) {
    case 'PREFILL_BOOKING': {
      const { pickupAddress, dropoffAddress, vehicleCategory, estimatedPrice } = action.payload;
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Booking Draft Prefilled
            </span>
            {estimatedPrice && (
              <span className="text-sm font-bold text-emerald-400">Est. ₹{estimatedPrice}</span>
            )}
          </div>
          <div className="space-y-1 text-xs text-slate-300">
            <div><strong className="text-slate-400">Pickup:</strong> {pickupAddress || 'Current Location'}</div>
            <div><strong className="text-slate-400">Dropoff:</strong> {dropoffAddress || 'Destination'}</div>
            <div><strong className="text-slate-400">Vehicle:</strong> {vehicleCategory || 'Sedan'}</div>
          </div>
          <Link
            href={`/bookings/new?pickup=${encodeURIComponent(pickupAddress || '')}&dropoff=${encodeURIComponent(dropoffAddress || '')}&vehicle=${encodeURIComponent(vehicleCategory || 'Sedan')}`}
            className="block text-center w-full py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition-colors"
          >
            Review & Complete Booking
          </Link>
        </div>
      );
    }

    case 'SHOW_PRICING': {
      const { vehicleCategory, baseFare, estimatedTotal, distanceKm, durationMinutes } = action.payload;
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Authoritative Fare Quote
          </div>
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-sm font-semibold text-slate-200">{vehicleCategory}</span>
            <span className="text-lg font-bold text-emerald-400">₹{estimatedTotal}</span>
          </div>
          <div className="text-slate-400 space-y-0.5">
            <div>Base Fare: ₹{baseFare}</div>
            {distanceKm && <div>Distance: {distanceKm} km</div>}
            {durationMinutes && <div>Est. Time: {durationMinutes} mins</div>}
          </div>
        </div>
      );
    }

    case 'SHOW_PROMOTION': {
      const { code, title, discountText, eligible } = action.payload;
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-mono font-bold text-sm text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {code}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${eligible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {eligible ? 'ELIGIBLE' : 'INELIGIBLE'}
            </span>
          </div>
          <div className="font-medium text-slate-200">{title}</div>
          <div className="text-slate-400">{discountText}</div>
        </div>
      );
    }

    case 'SHOW_REWARD': {
      const { currentPoints, tier, nextTierPoints, availableRewardsCount } = action.payload;
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-300">Loyalty Status</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">
              {tier}
            </span>
          </div>
          <div className="text-xl font-extrabold text-amber-400">{currentPoints} Points</div>
          <div className="text-slate-400">
            Need {nextTierPoints - currentPoints} points to reach next tier. {availableRewardsCount} rewards available.
          </div>
        </div>
      );
    }

    case 'SHOW_EARNINGS': {
      const { todayEarnings, completedTripsCount, periodLabel } = action.payload;
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2 text-xs">
          <div className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold">{periodLabel}</div>
          <div className="text-2xl font-black text-emerald-400">₹{todayEarnings}</div>
          <div className="text-slate-300">{completedTripsCount} Trips Completed</div>
        </div>
      );
    }

    case 'SHOW_INCENTIVE': {
      const { campaignName, currentProgress, targetRequirement, potentialBonus } = action.payload;
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-purple-500/30 space-y-2 text-xs">
          <div className="text-purple-400 font-semibold">{campaignName}</div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Progress: {currentProgress} / {targetRequirement} rides</span>
            <span className="font-bold text-amber-400">+₹{potentialBonus}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (currentProgress / targetRequirement) * 100)}%` }}
            />
          </div>
        </div>
      );
    }

    case 'SHOW_PICKUP_MAP': {
      const { pickupAddress, pickupLatitude, pickupLongitude } = action.payload;
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
          <div className="font-semibold text-slate-200">Pickup Location</div>
          <div className="text-slate-400">{pickupAddress}</div>
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
          >
            View Live Pickup Map
          </button>

          {mapOpen && (
            <LocationMapModal
              open={mapOpen}
              onClose={() => setMapOpen(false)}
              title="Customer Pickup Location"
              center={{ latitude: pickupLatitude, longitude: pickupLongitude }}
              markers={[
                {
                  id: 'pickup',
                  position: { latitude: pickupLatitude, longitude: pickupLongitude },
                  type: 'PICKUP',
                  title: 'Pickup Point',
                  snippet: pickupAddress,
                },
              ]}
            />
          )}
        </div>
      );
    }

    case 'TRIGGER_SOS': {
      return (
        <div className="mt-3 p-4 rounded-xl bg-rose-950/40 border border-rose-600/50 space-y-2 text-xs">
          <div className="text-rose-400 font-bold uppercase tracking-wider">⚠️ Safety SOS Triggered</div>
          <div className="text-slate-200">Immediate emergency assistance options are active.</div>
          <div className="flex gap-2 pt-1">
            <a
              href="tel:112"
              className="flex-1 text-center py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Call 112 Emergency
            </a>
            <Link
              href="/support"
              className="flex-1 text-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs"
            >
              Support Center
            </Link>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
