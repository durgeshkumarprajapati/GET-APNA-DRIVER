'use client';

import React, { useState, useCallback } from 'react';
import { GoogleMapCard } from './google-map-card';
import { MapboxMapCard } from './mapbox-map-card';
import { MapProviderManager } from '@/modules/maps/application/map-provider-manager';
import type {
  MapCoordinate,
  MapMarkerDefinition,
  MapProviderType,
} from '@/modules/maps/domain/map-types';

export interface UnifiedMapProps {
  center?: MapCoordinate;
  markers?: MapMarkerDefinition[];
  zoom?: number;
  height?: string;
  fitBounds?: boolean;
  className?: string;
  showControls?: boolean;
  mapId?: string;
  onMarkerClick?: (markerId: string) => void;
  ariaLabel?: string;
  showProviderBadge?: boolean;
  forceProvider?: MapProviderType;
}

const MARKER_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  CUSTOMER: { bg: '#3b82f6', text: '#ffffff', icon: 'person_pin' },
  DRIVER: { bg: '#25a475', text: '#ffffff', icon: 'directions_car' },
  PICKUP: { bg: '#f59e0b', text: '#ffffff', icon: 'trip_origin' },
  DROPOFF: { bg: '#ef4444', text: '#ffffff', icon: 'location_on' },
  CURRENT_LOCATION: { bg: '#8b5cf6', text: '#ffffff', icon: 'my_location' },
  WAYPOINT: { bg: '#06b6d4', text: '#ffffff', icon: 'place' },
};

export class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MapErrorBoundary] Caught map rendering exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function UnifiedMap({
  center,
  markers = [],
  zoom = 14,
  height = '350px',
  fitBounds = true,
  className = '',
  showControls = true,
  mapId,
  onMarkerClick,
  ariaLabel = 'Unified Multi-Provider Map',
  showProviderBadge = true,
  forceProvider,
}: UnifiedMapProps) {
  const [provider, setProvider] = useState<MapProviderType>(
    forceProvider || MapProviderManager.getActiveProvider(),
  );

  const handleGoogleError = useCallback(
    (reason: string) => {
      console.warn(`[UnifiedMap] Google Maps failed (${reason}). Switching to Mapbox GL.`);
      const nextProvider = MapProviderManager.reportProviderFailure('google', reason);
      setProvider(forceProvider || nextProvider);
    },
    [forceProvider],
  );

  const handleMapboxError = useCallback(
    (reason: string) => {
      console.warn(`[UnifiedMap] Mapbox failed (${reason}). Switching to location text fallback.`);
      const nextProvider = MapProviderManager.reportProviderFailure('mapbox', reason);
      setProvider(forceProvider || nextProvider);
    },
    [forceProvider],
  );

  const renderProviderBadge = () => {
    if (!showProviderBadge) return null;

    const isGoogle = provider === 'google';
    const isMapbox = provider === 'mapbox';

    const badgeLabel = isGoogle
      ? 'Google Maps'
      : isMapbox
        ? 'Mapbox (Fallback)'
        : 'Location Details (Offline)';

    const badgeClass = isGoogle
      ? 'bg-[#10141d]/90 text-[#68dba9] border-[#262a33]'
      : isMapbox
        ? 'bg-indigo-950/90 text-indigo-300 border-indigo-800'
        : 'bg-amber-950/90 text-amber-300 border-amber-800';

    return (
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <span
          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border shadow-md flex items-center gap-1 backdrop-blur-md ${badgeClass}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span>{badgeLabel}</span>
        </span>
      </div>
    );
  };

  const renderTextualFallback = () => (
    <div
      className={`relative w-full rounded-2xl bg-[#181c24] border border-[#262a33] p-5 flex flex-col justify-between overflow-hidden shadow-lg ${className}`}
      style={{ height }}
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#262a33]">
        <div className="flex items-center space-x-2 text-xs font-semibold text-[#87948b]">
          <span className="material-symbols-outlined text-amber-400 text-sm">map</span>
          <span>Authoritative Location Telemetry</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 font-mono border border-amber-800">
          MAP SERVICE UNCONSTRAINED
        </span>
      </div>

      <div className="my-auto space-y-3">
        {markers.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5">
            {markers.map((m) => {
              const style = MARKER_COLORS[m.type] || MARKER_COLORS.PICKUP;
              return (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-[#10141d] border border-[#262a33] flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: style.bg }}
                    >
                      <span className="material-symbols-outlined text-sm">{style.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#dfe2ee] truncate">{m.title}</p>
                      {m.snippet && (
                        <p className="text-[10px] text-[#87948b] truncate">{m.snippet}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#68dba9] shrink-0 ml-2">
                    {m.position.latitude.toFixed(4)}, {m.position.longitude.toFixed(4)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-[#87948b]">
            No active location coordinates provided.
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#262a33] flex items-center justify-between text-[11px] text-[#87948b]">
        <span>GET APNA DRIVER Unified Location System</span>
        {markers.length > 0 && (
          <a
            href={`https://www.google.com/maps?q=${markers[0].position.latitude},${markers[0].position.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#68dba9] hover:underline inline-flex items-center gap-1"
          >
            <span>Open Maps</span>
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </a>
        )}
      </div>
    </div>
  );

  return (
    <MapErrorBoundary fallback={renderTextualFallback()}>
      <div className="relative w-full h-full">
        {renderProviderBadge()}

        {provider === 'google' && (
          <GoogleMapCard
            center={center}
            markers={markers}
            zoom={zoom}
            height={height}
            fitBounds={fitBounds}
            className={className}
            showControls={showControls}
            mapId={mapId}
            onMarkerClick={onMarkerClick}
            ariaLabel={ariaLabel}
            onLoadError={handleGoogleError}
          />
        )}

        {provider === 'mapbox' && (
          <MapboxMapCard
            center={center}
            markers={markers}
            zoom={zoom}
            height={height}
            fitBounds={fitBounds}
            className={className}
            showControls={showControls}
            onMarkerClick={onMarkerClick}
            ariaLabel={ariaLabel}
            onLoadError={handleMapboxError}
          />
        )}

        {provider === 'fallback' && renderTextualFallback()}
      </div>
    </MapErrorBoundary>
  );
}
