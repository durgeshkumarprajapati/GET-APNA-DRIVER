'use client';

import { useEffect } from 'react';
import { GoogleMapCard } from './google-map-card';
import type { MapCoordinate, MapMarkerDefinition } from '@/modules/maps/domain/map-types';

export interface LocationMapModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  markers?: MapMarkerDefinition[];
  center?: MapCoordinate;
  height?: string;
}

export function LocationMapModal({
  open,
  onClose,
  title = 'Location Map View',
  subtitle,
  markers = [],
  center,
  height = '450px',
}: LocationMapModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[#181c24] border border-[#262a33] rounded-3xl shadow-2xl overflow-hidden flex flex-col space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#262a33]">
          <div>
            <h3 id="map-modal-title" className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-[#87948b] mt-0.5">{subtitle}</p>}
          </div>

          <button
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-[#262a33]/60 hover:bg-[#262a33] text-[#87948b] hover:text-[#dfe2ee] transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
            title="Close Map (Esc)"
            aria-label="Close Map"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <GoogleMapCard
          markers={markers}
          center={center}
          height={height}
          fitBounds={true}
          showControls={true}
        />

        <div className="pt-2 flex items-center justify-between text-xs text-[#87948b]">
          <span>GET APNA DRIVER Secure Telemetry</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#262a33] hover:bg-[#323743] text-[#dfe2ee] font-semibold transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
