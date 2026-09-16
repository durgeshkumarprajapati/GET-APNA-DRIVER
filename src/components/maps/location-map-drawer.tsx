'use client';

import { useEffect } from 'react';
import { GoogleMapCard } from './google-map-card';
import type { MapCoordinate, MapMarkerDefinition } from '@/modules/maps/domain/map-types';

export interface LocationMapDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  markers?: MapMarkerDefinition[];
  center?: MapCoordinate;
  height?: string;
}

export function LocationMapDrawer({
  open,
  onClose,
  title = 'Live Map',
  subtitle,
  markers = [],
  center,
  height = '60vh',
}: LocationMapDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-drawer-title"
      onClick={onClose}
    >
      <div
        className="w-full bg-[#181c24] border-t border-[#262a33] rounded-t-3xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-[#262a33] rounded-full mx-auto" />

        <div className="flex items-center justify-between pb-2 border-b border-[#262a33]">
          <div>
            <h3
              id="map-drawer-title"
              className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']"
            >
              {title}
            </h3>
            {subtitle && <p className="text-xs text-[#87948b] mt-0.5">{subtitle}</p>}
          </div>

          <button
            onClick={onClose}
            className="w-12 h-12 rounded-xl bg-[#262a33]/60 text-[#87948b] hover:text-[#dfe2ee] transition-colors flex items-center justify-center focus:outline-none"
            title="Close Drawer"
            aria-label="Close Drawer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <GoogleMapCard
          markers={markers}
          center={center}
          height={height}
          fitBounds={true}
          showControls={true}
        />

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-sm transition-colors min-h-[48px] flex items-center justify-center"
        >
          Close Map
        </button>
      </div>
    </div>
  );
}
