'use client';

import { useState } from 'react';
import { LocationMapModal } from '@/components/maps/location-map-modal';
import type { MapMarkerType } from '@/modules/maps/domain/map-types';

export interface LocationMapLinkProps {
  latitude: number;
  longitude: number;
  label?: string;
  markerType?: MapMarkerType;
  title?: string;
}

/**
 * Reusable map presentation link component.
 * Opens an embedded same-page GoogleMapModal inside the application.
 * Does NOT redirect to external Google Maps website or open separate browser tabs.
 */
export function LocationMapLink({
  latitude,
  longitude,
  label = 'View on map',
  markerType = 'PICKUP',
  title = 'Location Map View',
}: LocationMapLinkProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const marker = {
    id: `map-link-${latitude}-${longitude}`,
    position: { latitude, longitude },
    type: markerType,
    title: label,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-[#68dba9] hover:underline font-mono focus:outline-none min-h-[48px] px-2 rounded-lg hover:bg-[#262a33]/40 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">location_on</span>
        <span>{label}</span>
        <span className="text-[10px] text-[#87948b]">
          ({latitude.toFixed(4)}, {longitude.toFixed(4)})
        </span>
      </button>

      <LocationMapModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={title}
        subtitle={`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
        markers={[marker]}
        center={{ latitude, longitude }}
      />
    </>
  );
}
