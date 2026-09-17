/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadMapboxScript } from '@/modules/maps/infrastructure/mapbox-loader';
import type { MapCoordinate, MapMarkerDefinition } from '@/modules/maps/domain/map-types';

export interface MapboxMapCardProps {
  center?: MapCoordinate;
  markers?: MapMarkerDefinition[];
  zoom?: number;
  height?: string;
  fitBounds?: boolean;
  className?: string;
  showControls?: boolean;
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
  CURRENT_LOCATION: { bg: '#8b5cf6', text: '#ffffff', icon: 'my_location' },
  WAYPOINT: { bg: '#06b6d4', text: '#ffffff', icon: 'place' },
};

export function MapboxMapCard({
  center,
  markers = [],
  zoom = 14,
  height = '350px',
  fitBounds = true,
  className = '',
  showControls = true,
  onMarkerClick,
  onMapClick,
  onLoadError,
  ariaLabel = 'Interactive Mapbox Map',
}: MapboxMapCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapboxMarkersRef = useRef<Map<string, any>>(new Map());

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Create custom marker HTML element
  const createMarkerElement = useCallback((m: MapMarkerDefinition) => {
    const style = MARKER_COLORS[m.type] || MARKER_COLORS.PICKUP;
    const el = document.createElement('div');
    el.className =
      'flex items-center justify-center p-1.5 rounded-full shadow-lg border-2 border-white transition-transform hover:scale-110 cursor-pointer';
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

  // Update or sync Mapbox markers
  const updateMarkers = useCallback(
    (mapboxgl: any) => {
      const map = mapInstanceRef.current;
      if (!map || !mapboxgl) return;

      const currentMap = mapboxMarkersRef.current;
      const newMarkerIds = new Set(markers.map((m) => m.id));

      // Remove obsolete markers
      currentMap.forEach((markerInstance, id) => {
        if (!newMarkerIds.has(id)) {
          markerInstance.remove();
          currentMap.delete(id);
        }
      });

      // Add or update markers
      markers.forEach((m) => {
        const existing = currentMap.get(m.id);
        const lngLat: [number, number] = [m.position.longitude, m.position.latitude];

        if (existing) {
          existing.setLngLat(lngLat);
        } else {
          const el = createMarkerElement(m);
          if (onMarkerClick) {
            el.addEventListener('click', () => onMarkerClick(m.id));
          }

          const markerInstance = new mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map);

          currentMap.set(m.id, markerInstance);
        }
      });

      // Fit bounds if requested and markers exist
      if (fitBounds && markers.length > 0) {
        if (markers.length === 1) {
          map.setCenter([markers[0].position.longitude, markers[0].position.latitude]);
          map.setZoom(zoom);
        } else {
          const bounds = new mapboxgl.LngLatBounds();
          markers.forEach((m) => {
            bounds.extend([m.position.longitude, m.position.latitude]);
          });
          map.fitBounds(bounds, { padding: 50, maxZoom: 16 });
        }
      }
    },
    [markers, fitBounds, zoom, createMarkerElement, onMarkerClick],
  );

  // Initialize Mapbox instance
  useEffect(() => {
    let isMounted = true;

    const initMapbox = async () => {
      if (!accessToken) {
        const errMsg = 'Mapbox access token is missing.';
        if (isMounted) {
          setLoading(false);
          setLoadError(errMsg);
          if (onLoadError) onLoadError(errMsg);
        }
        return;
      }

      try {
        const mapboxgl = await loadMapboxScript(accessToken);
        if (!isMounted || !containerRef.current) return;

        if (!mapInstanceRef.current && containerRef.current) {
          const defaultCenter: [number, number] = center
            ? [center.longitude, center.latitude]
            : markers.length > 0
              ? [markers[0].position.longitude, markers[0].position.latitude]
              : [72.8777, 19.076]; // Mumbai

          mapInstanceRef.current = new mapboxgl.Map({
            container: containerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: defaultCenter,
            zoom,
            attributionControl: false,
          });

          if (showControls) {
            mapInstanceRef.current.addControl(
              new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }),
              'top-right',
            );
          }
        }

        if (isMounted) {
          setLoading(false);
          setLoadError(null);
          updateMarkers(mapboxgl);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to initialize Mapbox GL Map';
        if (isMounted) {
          setLoading(false);
          setLoadError(errMsg);
          if (onLoadError) onLoadError(errMsg);
        }
      }
    };

    void initMapbox();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Handle click events on map for location selection
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !onMapClick || loading || loadError) return;

    const handleClick = (e: { lngLat: { lat: number; lng: number } }) => {
      if (e.lngLat) {
        onMapClick({
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
        });
      }
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [onMapClick, loading, loadError]);

  // Recenter helper button
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || markers.length === 0 || typeof window === 'undefined' || !window.mapboxgl) return;

    if (markers.length === 1) {
      map.setCenter([markers[0].position.longitude, markers[0].position.latitude]);
      map.setZoom(zoom);
    } else {
      const bounds = new window.mapboxgl.LngLatBounds();
      markers.forEach((m) => {
        bounds.extend([m.position.longitude, m.position.latitude]);
      });
      map.fitBounds(bounds, { padding: 50, maxZoom: 16 });
    }
  };

  if (loadError || !accessToken) {
    return null; // Will trigger fallback container in UnifiedMap
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
          <span>Loading Mapbox Map…</span>
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
