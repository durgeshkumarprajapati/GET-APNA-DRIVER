'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapsScript } from '@/modules/maps/infrastructure/google-maps-loader';
import type { MapCoordinate, MapMarkerDefinition } from '@/modules/maps/domain/map-types';

export interface GoogleMapCardProps {
  center?: MapCoordinate;
  markers?: MapMarkerDefinition[];
  zoom?: number;
  height?: string;
  fitBounds?: boolean;
  className?: string;
  showControls?: boolean;
  mapId?: string;
  onMarkerClick?: (markerId: string) => void;
  onMapClick?: (coord: MapCoordinate) => void;
  onLoadError?: (error: string) => void;
  ariaLabel?: string;
}

const MARKER_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  CUSTOMER: { bg: '#3b82f6', text: '#ffffff', icon: 'person_pin' },
  DRIVER: { bg: '#25a475', text: '#ffffff', icon: 'directions_car' },
  PICKUP: { bg: '#f59e0b', text: '#ffffff', icon: 'trip_origin' },
  DROPOFF: { bg: '#ef4444', text: '#ffffff', icon: 'location_on' },
};

export function GoogleMapCard({
  center,
  markers = [],
  zoom = 14,
  height = '350px',
  fitBounds = true,
  className = '',
  showControls = true,
  mapId,
  onMarkerClick,
  onMapClick,
  onLoadError,
  ariaLabel = 'Interactive Google Map',
}: GoogleMapCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const advancedMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(
    new Map(),
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeMapId = mapId || process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Render marker custom DOM element
  const createMarkerElement = useCallback((m: MapMarkerDefinition) => {
    const style = MARKER_COLORS[m.type] || MARKER_COLORS.PICKUP;
    const el = document.createElement('div');
    el.className =
      'flex items-center justify-center p-1.5 rounded-full shadow-lg border-2 border-white transition-transform hover:scale-110';
    el.style.backgroundColor = style.bg;
    el.style.color = style.text;
    el.title = m.title;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-symbols-outlined text-sm leading-none';
    iconSpan.innerText = style.icon;
    el.appendChild(iconSpan);

    if (m.type === 'DRIVER' && typeof m.heading === 'number') {
      el.style.transform = `rotate(${m.heading}deg)`;
    }

    return el;
  }, []);

  // Update existing markers or create new ones without recreating map
  const updateMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof google === 'undefined' || !google.maps?.marker?.AdvancedMarkerElement) {
      return;
    }

    const currentMarkerMap = advancedMarkersRef.current;
    const newMarkerIds = new Set(markers.map((m) => m.id));

    // Remove obsolete markers
    currentMarkerMap.forEach((advMarker, id) => {
      if (!newMarkerIds.has(id)) {
        advMarker.map = null;
        currentMarkerMap.delete(id);
      }
    });

    // Create or update markers
    markers.forEach((m) => {
      const existing = currentMarkerMap.get(m.id);
      const position = { lat: m.position.latitude, lng: m.position.longitude };

      if (existing) {
        existing.position = position;
        existing.content = createMarkerElement(m);
      } else {
        const newAdvMarker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          title: m.title,
          content: createMarkerElement(m),
        });

        if (onMarkerClick) {
          newAdvMarker.addListener('click', () => onMarkerClick(m.id));
        }

        currentMarkerMap.set(m.id, newAdvMarker);
      }
    });

    // Fit bounds if requested and markers exist
    if (fitBounds && markers.length > 0) {
      if (markers.length === 1) {
        map.setCenter({ lat: markers[0].position.latitude, lng: markers[0].position.longitude });
        map.setZoom(zoom);
      } else {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach((m) => {
          bounds.extend({ lat: m.position.latitude, lng: m.position.longitude });
        });
        map.fitBounds(bounds, 50);
      }
    }
  }, [markers, fitBounds, zoom, createMarkerElement, onMarkerClick]);

  // Initialize map instance once
  useEffect(() => {
    let isMounted = true;

    // Register Google Maps auth/billing error handler (e.g. BillingNotEnabledMapError)
    const existingAuthFailure = (window as unknown as Record<string, unknown>).gm_authFailure;
    (window as unknown as Record<string, unknown>).gm_authFailure = () => {
      const errMsg =
        'Google Maps API error: BillingNotEnabledMapError or authentication failed. Switching to Mapbox GL JS.';
      console.warn(`[GoogleMapCard] ${errMsg}`);
      if (isMounted) {
        setLoading(false);
        setLoadError(errMsg);
        if (onLoadError) onLoadError(errMsg);
      }
      if (typeof existingAuthFailure === 'function') {
        (existingAuthFailure as () => void)();
      }
    };

    // Capture global unhandled Google Maps console/script errors (e.g. BillingNotEnabledMapError)
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = String(event.message || event.error?.message || '');
      if (
        msg.includes('BillingNotEnabledMapError') ||
        msg.includes('ApiNotActivatedMapError') ||
        msg.includes('InvalidKeyMapError') ||
        msg.includes('Google Maps JavaScript API error')
      ) {
        const errMsg = `Google Maps API error: ${msg}. Switching to Mapbox GL JS.`;
        console.warn(`[GoogleMapCard] ${errMsg}`);
        if (isMounted) {
          setLoading(false);
          setLoadError(errMsg);
          if (onLoadError) onLoadError(errMsg);
        }
      }
    };
    window.addEventListener('error', handleGlobalError);

    const initMap = async () => {
      if (!apiKey) {
        const errMsg = 'Google Maps API key is missing.';
        if (isMounted) {
          setLoading(false);
          setLoadError(errMsg);
          if (onLoadError) onLoadError(errMsg);
        }
        return;
      }

      try {
        await loadGoogleMapsScript(apiKey);
        if (!isMounted || !containerRef.current) return;

        const mapsLib = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
        await google.maps.importLibrary('marker');

        if (!mapInstanceRef.current && containerRef.current) {
          const defaultCenter = center
            ? { lat: center.latitude, lng: center.longitude }
            : markers.length > 0
              ? { lat: markers[0].position.latitude, lng: markers[0].position.longitude }
              : { lat: 19.076, lng: 72.8777 }; // Default Mumbai

          mapInstanceRef.current = new mapsLib.Map(containerRef.current, {
            center: defaultCenter,
            zoom,
            mapId: activeMapId,
            disableDefaultUI: !showControls,
            zoomControl: showControls,
          });
        }

        if (isMounted) {
          setLoading(false);
          setLoadError(null);
          updateMarkers();
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to initialize Google Map';
        if (isMounted) {
          setLoading(false);
          setLoadError(errMsg);
          if (onLoadError) onLoadError(errMsg);
        }
      }
    };

    void initMap();

    return () => {
      isMounted = false;
      window.removeEventListener('error', handleGlobalError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, activeMapId]);

  // Handle map click listener for selecting coordinates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !onMapClick || loading || loadError) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = map.addListener('click', (e: any) => {
      if (e?.latLng) {
        const lat = typeof e.latLng.lat === 'function' ? e.latLng.lat() : e.latLng.lat;
        const lng = typeof e.latLng.lng === 'function' ? e.latLng.lng() : e.latLng.lng;
        onMapClick({
          latitude: lat,
          longitude: lng,
        });
      }
    });

    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }, [onMapClick, loading, loadError]);

  // Handle marker updates when props change
  useEffect(() => {
    if (mapInstanceRef.current && !loading && !loadError) {
      updateMarkers();
    }
  }, [markers, loading, loadError, updateMarkers]);

  // Recenter button helper
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || markers.length === 0) return;
    if (markers.length === 1) {
      map.setCenter({ lat: markers[0].position.latitude, lng: markers[0].position.longitude });
      map.setZoom(zoom);
    } else {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => {
        bounds.extend({ lat: m.position.latitude, lng: m.position.longitude });
      });
      map.fitBounds(bounds, 50);
    }
  };

  // Fallback view when Google Maps API key is missing or load failed
  if (loadError || !apiKey) {
    return (
      <div
        className={`relative w-full rounded-2xl bg-[#181c24] border border-[#262a33] p-5 flex flex-col justify-between overflow-hidden shadow-lg ${className}`}
        style={{ height }}
        aria-label={ariaLabel}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#262a33]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#87948b]">
            <span className="material-symbols-outlined text-amber-400 text-sm">map</span>
            <span>Location Map Summary</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#262a33] text-[#87948b] font-mono">
            MAP FALLBACK
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
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: style.bg }}
                      >
                        <span className="material-symbols-outlined text-sm">{style.icon}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#dfe2ee]">{m.title}</p>
                        {m.snippet && <p className="text-[10px] text-[#87948b]">{m.snippet}</p>}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#68dba9]">
                      {m.position.latitude.toFixed(4)}, {m.position.longitude.toFixed(4)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-[#87948b]">
              No location coordinates provided.
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-[#262a33] flex items-center justify-between text-[11px] text-[#87948b]">
          <span>GET APNA DRIVER Location Service</span>
          <a
            href={
              markers.length > 0
                ? `https://www.google.com/maps?q=${markers[0].position.latitude},${markers[0].position.longitude}`
                : '#'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#68dba9] hover:underline inline-flex items-center gap-1"
          >
            <span>External Map</span>
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-[#262a33] shadow-lg ${className}`}
      style={{ height }}
      aria-label={ariaLabel}
    >
      {loading && (
        <div className="absolute inset-0 z-10 bg-[#181c24]/90 backdrop-blur-sm flex items-center justify-center text-xs text-[#87948b] space-x-2">
          <span className="material-symbols-outlined animate-spin text-lg text-[#68dba9]">
            progress_activity
          </span>
          <span>Loading Map…</span>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />

      {!loading && markers.length > 0 && showControls && (
        <button
          onClick={handleRecenter}
          className="absolute bottom-3 right-3 z-20 p-2.5 rounded-xl bg-[#181c24]/90 hover:bg-[#181c24] border border-[#262a33] text-[#dfe2ee] hover:text-[#68dba9] transition-colors shadow-md flex items-center justify-center"
          title="Recenter Map"
        >
          <span className="material-symbols-outlined text-base">my_location</span>
        </button>
      )}
    </div>
  );
}
