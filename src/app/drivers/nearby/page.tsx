'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SavedLocation {
  id: string;
  label: string;
  addressLine1: string;
  city: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

interface NearbyDriver {
  driverId: string;
  displayName: string;
  profileImageUrl: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  distanceMeters: number;
  distanceFormatted: string;
}

export default function NearbyDriversPage() {
  const [locationMode, setLocationMode] = useState<'device' | 'saved' | 'manual'>('device');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string>('');
  const [manualLat, setManualLat] = useState<string>('28.6139'); // Default New Delhi
  const [manualLng, setManualLng] = useState<string>('77.2090');
  const [radiusMeters, setRadiusMeters] = useState<number>(5000);

  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  // Fetch saved locations for customer
  useEffect(() => {
    let isMounted = true;
    const fetchSaved = async () => {
      try {
        const res = await fetch('/api/customer/locations');
        if (res.ok && isMounted) {
          const data = await res.json();
          const list: SavedLocation[] = data.locations || [];
          setSavedLocations(list);
          const defaultLoc = list.find((l) => l.isDefault) || list[0];
          if (defaultLoc) {
            setSelectedSavedId(defaultLoc.id);
          }
        }
      } catch {
        // Ignore saved locations error
      }
    };
    void fetchSaved();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const syncLocation = async () => {
      if (!isMounted) return;
      if (locationMode === 'device') {
        if (typeof window !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (!isMounted) return;
              const newCoords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              setCoords(newCoords);
              setLocationError(null);

              void fetch('/api/location/current', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  latitude: newCoords.latitude,
                  longitude: newCoords.longitude,
                  accuracy: position.coords.accuracy,
                  source: 'BROWSER_GPS',
                }),
              });
            },
            (err) => {
              if (isMounted) {
                setLocationError(
                  `Location permission error: ${err.message}. Please select a saved or manual location below.`,
                );
              }
            },
            { enableHighAccuracy: true, timeout: 10000 },
          );
        }
      } else if (locationMode === 'saved') {
        const loc = savedLocations.find((l) => l.id === selectedSavedId);
        if (loc) {
          setCoords({ latitude: loc.latitude, longitude: loc.longitude });
        }
      } else if (locationMode === 'manual') {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          setCoords({ latitude: lat, longitude: lng });
        }
      }
    };
    void syncLocation();
    return () => {
      isMounted = false;
    };
  }, [locationMode, selectedSavedId, manualLat, manualLng, savedLocations]);

  const executeSearch = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    setSearchMessage(null);

    try {
      const url = `/api/drivers/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radiusMeters=${radiusMeters}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setDrivers(data.drivers || []);
        if ((data.drivers || []).length === 0) {
          setSearchMessage('No active drivers found within the selected search radius.');
        }
      } else {
        setSearchMessage(data.message || 'Failed to search nearby drivers.');
      }
    } catch {
      setSearchMessage('Error searching nearby drivers.');
    } finally {
      setLoading(false);
    }
  }, [coords, radiusMeters]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (isMounted) await executeSearch();
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [executeSearch]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link href="/profile" className="hover:text-emerald-400 transition-colors">
                Customer Portal
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">Nearby Drivers</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Find Nearby Drivers</h1>
            <p className="text-slate-400 mt-1">
              Discover available verified drivers near your current or selected location.
            </p>
          </div>

          <Link
            href="/profile"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
          >
            Dashboard
          </Link>
        </div>

        {/* Location Selection Controls */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
          <h2 className="text-lg font-semibold text-white">Search Location & Radius</h2>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setLocationMode('device')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${locationMode === 'device' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
            >
              Use GPS Device Location
            </button>

            <button
              onClick={() => setLocationMode('saved')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${locationMode === 'saved' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
            >
              Select Saved Address
            </button>

            <button
              onClick={() => setLocationMode('manual')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${locationMode === 'manual' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
            >
              Manual Coordinates
            </button>
          </div>

          {locationError && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm">
              {locationError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {locationMode === 'saved' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  Saved Address
                </label>
                <select
                  value={selectedSavedId}
                  onChange={(e) => setSelectedSavedId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none"
                >
                  {savedLocations.length === 0 ? (
                    <option value="">No saved locations found</option>
                  ) : (
                    savedLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.label} — {loc.addressLine1}, {loc.city}{' '}
                        {loc.isDefault ? '(Default)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {locationMode === 'manual' && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Latitude</label>
                  <input
                    type="text"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Longitude</label>
                  <input
                    type="text"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Search Radius</label>
              <select
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none"
              >
                <option value={2000}>2 km</option>
                <option value={5000}>5 km (Default)</option>
                <option value={10000}>10 km</option>
                <option value={20000}>20 km (Max)</option>
              </select>
            </div>
          </div>

          {coords && (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>
                Active Search Coords: {coords.latitude.toFixed(4)}°, {coords.longitude.toFixed(4)}°
              </span>
            </div>
          )}
        </div>

        {/* Nearby Drivers Results Grid */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-700 pb-4">
            <h2 className="text-xl font-semibold text-white">
              Available Drivers ({drivers.length})
            </h2>
            <button
              onClick={() => void executeSearch()}
              disabled={loading || !coords}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-2"
            >
              {loading && (
                <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
              )}
              Refresh Drivers
            </button>
          </div>

          {searchMessage && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 text-sm text-center">
              {searchMessage}
            </div>
          )}

          {drivers.length === 0 && !loading && !searchMessage && (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-700 rounded-xl">
              No available drivers nearby. Try increasing search radius or changing location.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => (
              <div
                key={driver.driverId}
                className="p-5 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-lg space-y-4 hover:border-emerald-500/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-950 border border-emerald-700/80 flex items-center justify-center font-bold text-emerald-300 text-lg">
                      {driver.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base">{driver.displayName}</h3>
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Available Now
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {driver.distanceFormatted}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Experience:</span>
                    <span className="font-medium text-white">
                      {driver.drivingExperienceYears} Years
                    </span>
                  </div>
                  {driver.primaryServiceArea && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Service Area:</span>
                      <span className="font-medium text-white">{driver.primaryServiceArea}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
